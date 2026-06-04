package com.bijlipay.iob.branch;

import com.bijlipay.iob.branch.dto.BranchResponse;
import com.bijlipay.iob.branch.dto.BulkImportResponse;
import com.bijlipay.iob.common.exception.ApiException;
import com.bijlipay.iob.reference.ReferenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFDataValidation;
import org.apache.poi.xssf.usermodel.XSSFDataValidationConstraint;
import org.apache.poi.xssf.usermodel.XSSFDataValidationHelper;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class BranchBulkService {

    public static final String[] HEADERS = {"Sole ID", "Branch Name", "City", "State", "Pincode", "Bank Region", "Status"};

    private final BranchRepository branchRepository;
    private final ReferenceService referenceService;

    public byte[] buildTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = wb.createSheet("Branches");

            XSSFCellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(new XSSFColor(new Color(0x5B, 0x2C, 0x6F), null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 20 * 256);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("0023");
            sample.createCell(1).setCellValue("Chennai Main");
            sample.createCell(2).setCellValue("Chennai");
            sample.createCell(3).setCellValue("Tamil Nadu");
            sample.createCell(4).setCellValue("600001");
            sample.createCell(5).setCellValue("ROTN");
            sample.createCell(6).setCellValue("Active");

            // Status dropdown on column G (index 6), rows 2..1000
            XSSFDataValidationHelper helper = new XSSFDataValidationHelper(sheet);
            XSSFDataValidationConstraint constraint =
                    (XSSFDataValidationConstraint) helper.createExplicitListConstraint(new String[]{"Active", "Inactive"});
            CellRangeAddressList range = new CellRangeAddressList(1, 1000, 6, 6);
            XSSFDataValidation validation = (XSSFDataValidation) helper.createValidation(constraint, range);
            validation.setShowErrorBox(true);
            sheet.addValidationData(validation);

            XSSFSheet instructions = wb.createSheet("Instructions");
            String[] notes = {
                    "Branches bulk upload template",
                    "",
                    "Required columns: Sole ID, Branch Name, City, State, Pincode",
                    "Optional: Bank Region (e.g., ROTN, ROKL). Used to populate bank_region on lead submission.",
                    "Status defaults to Active when blank. Allowed: Active | Inactive.",
                    "Pincode must be exactly 6 digits.",
                    "State must be a valid Indian state or UT (e.g., Tamil Nadu, Karnataka, Delhi).",
                    "Sole ID must be unique. Duplicate Sole IDs (existing or within the file) will fail.",
                    "First row is the header. Data starts from row 2."
            };
            for (int i = 0; i < notes.length; i++) {
                Row r = instructions.createRow(i);
                r.createCell(0).setCellValue(notes[i]);
            }
            instructions.setColumnWidth(0, 100 * 256);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to build template: " + e.getMessage());
        }
    }

    public BulkImportResponse bulkImport(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File must be .xlsx or .xls");
        }

        List<ParsedRow> rows = parseRows(file);
        Set<String> soleIdsInFile = new HashSet<>();
        List<BranchResponse> imported = new ArrayList<>();
        List<BulkImportResponse.FailedRow> failed = new ArrayList<>();

        for (ParsedRow row : rows) {
            List<String> errors = new ArrayList<>();
            List<String> missing = new ArrayList<>();

            String soleId    = trim(row.data.get("Sole ID"));
            String branchName = trim(row.data.get("Branch Name"));
            String city      = trim(row.data.get("City"));
            String state     = trim(row.data.get("State"));
            String pincode   = trim(row.data.get("Pincode"));
            String bankRegion = trim(row.data.get("Bank Region"));
            String status    = trim(row.data.get("Status"));

            if (soleId.isEmpty())     { missing.add("Sole ID"); }
            if (branchName.isEmpty()) { missing.add("Branch Name"); }
            if (city.isEmpty())       { missing.add("City"); }
            if (state.isEmpty())      { missing.add("State"); }
            if (pincode.isEmpty())    { missing.add("Pincode"); }

            for (String f : missing) errors.add(f + " is required");

            if (!pincode.isEmpty() && !pincode.matches("\\d{6}")) {
                errors.add("Pincode must be exactly 6 digits");
            }

            String canonicalState = null;
            if (!state.isEmpty()) {
                canonicalState = referenceService.canonicalState(state);
                if (canonicalState == null) {
                    errors.add("State '" + state + "' is not a valid Indian state or UT");
                }
            }

            BranchStatus statusEnum = BranchStatus.ACTIVE;
            if (!status.isEmpty()) {
                BranchStatus parsed = BranchStatus.fromLabel(status);
                if (parsed == null) {
                    errors.add("Status must be 'Active' or 'Inactive'");
                } else {
                    statusEnum = parsed;
                }
            }

            if (!soleId.isEmpty()) {
                if (!soleIdsInFile.add(soleId.toLowerCase(Locale.ROOT))) {
                    errors.add("Sole ID '" + soleId + "' is duplicated in this file");
                } else if (branchRepository.existsBySoleIdIgnoreCase(soleId)) {
                    errors.add("Sole ID '" + soleId + "' already exists");
                }
            }

            if (!errors.isEmpty()) {
                failed.add(new BulkImportResponse.FailedRow(row.rowNumber, row.data, errors, missing));
                continue;
            }

            try {
                Branch saved = branchRepository.save(Branch.builder()
                        .soleId(soleId)
                        .branchName(branchName)
                        .city(city)
                        .state(canonicalState)
                        .pincode(pincode)
                        .bankRegion(bankRegion.isEmpty() ? null : bankRegion)
                        .status(statusEnum)
                        .build());
                imported.add(BranchResponse.from(saved));
            } catch (Exception e) {
                log.warn("Bulk import row {} save failed", row.rowNumber, e);
                failed.add(new BulkImportResponse.FailedRow(
                        row.rowNumber, row.data, List.of("Database error: " + e.getMessage()), List.of()));
            }
        }

        return new BulkImportResponse(rows.size(), imported.size(), failed.size(), imported, failed);
    }

    private List<ParsedRow> parseRows(MultipartFile file) {
        List<ParsedRow> result = new ArrayList<>();
        try (InputStream is = file.getInputStream(); Workbook wb = WorkbookFactory.create(is)) {
            Sheet sheet = pickSheet(wb);
            if (sheet == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "No sheet with the expected header row was found");
            }

            Map<Integer, String> headerByCol = readHeader(sheet);
            DataFormatter formatter = new DataFormatter();
            int last = sheet.getLastRowNum();
            for (int r = 1; r <= last; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                if (isRowBlank(row, formatter)) continue;

                Map<String, String> data = new LinkedHashMap<>();
                for (Map.Entry<Integer, String> e : headerByCol.entrySet()) {
                    Cell c = row.getCell(e.getKey());
                    data.put(e.getValue(), c == null ? "" : formatter.formatCellValue(c).trim());
                }
                for (String h : HEADERS) data.putIfAbsent(h, "");
                result.add(new ParsedRow(r + 1, data));
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse uploaded file", e);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Could not read Excel file: " + e.getMessage());
        }
        return result;
    }

    private Sheet pickSheet(Workbook wb) {
        for (int i = 0; i < wb.getNumberOfSheets(); i++) {
            Sheet s = wb.getSheetAt(i);
            Row h = s.getRow(0);
            if (h == null) continue;
            DataFormatter formatter = new DataFormatter();
            Set<String> headers = new HashSet<>();
            for (Cell c : h) headers.add(formatter.formatCellValue(c).trim());
            if (headers.contains("Sole ID") && headers.contains("Branch Name")) {
                return s;
            }
        }
        return null;
    }

    private Map<Integer, String> readHeader(Sheet sheet) {
        Map<Integer, String> map = new LinkedHashMap<>();
        Row header = sheet.getRow(0);
        DataFormatter formatter = new DataFormatter();
        for (Cell c : header) {
            String label = formatter.formatCellValue(c).trim();
            if (!label.isEmpty()) map.put(c.getColumnIndex(), label);
        }
        return map;
    }

    private boolean isRowBlank(Row row, DataFormatter formatter) {
        for (Cell c : row) {
            if (c != null && !formatter.formatCellValue(c).trim().isEmpty()) return false;
        }
        return true;
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private record ParsedRow(int rowNumber, Map<String, String> data) {}
}
