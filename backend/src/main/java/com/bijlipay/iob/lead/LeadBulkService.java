package com.bijlipay.iob.lead;

import com.bijlipay.iob.branch.Branch;
import com.bijlipay.iob.branch.BranchRepository;
import com.bijlipay.iob.branch.BranchStatus;
import com.bijlipay.iob.branch.dto.BranchResponse;
import com.bijlipay.iob.common.exception.ApiException;
import com.bijlipay.iob.lead.dto.LeadBulkParseResponse;
import com.bijlipay.iob.lead.dto.LeadBulkRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.*;
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
public class LeadBulkService {

    public static final String[] HEADERS = {
            "Merchant Name", "Contact Name", "Contact Number", "Alternate Number",
            "Email", "Merchant Address", "Pincode", "State", "City",
            "Device Type", "Device Count"
    };

    private static final Map<String, String> DEVICE_MODELS = Map.of(
            "android pos",     "A75PRO",
            "all-in-one pos",  "Q161_PRO_SQR"
    );

    private final BranchRepository branchRepository;

    public byte[] buildTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = wb.createSheet("Leads");

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
                sheet.setColumnWidth(i, 22 * 256);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("Sri Sai Stores");
            sample.createCell(1).setCellValue("Ramesh Kumar");
            sample.createCell(2).setCellValue("9876543210");
            sample.createCell(3).setCellValue("9876543211");
            sample.createCell(4).setCellValue("contact@srisai.com");
            sample.createCell(5).setCellValue("12 Main Road, T. Nagar, Chennai");
            sample.createCell(6).setCellValue("600017");
            sample.createCell(7).setCellValue("Tamil Nadu");
            sample.createCell(8).setCellValue("Chennai");
            sample.createCell(9).setCellValue("Android POS");
            sample.createCell(10).setCellValue(1);

            // Device Type dropdown on column J (index 9), rows 2..1000
            XSSFDataValidationHelper helper = new XSSFDataValidationHelper(sheet);
            XSSFDataValidationConstraint constraint = (XSSFDataValidationConstraint)
                    helper.createExplicitListConstraint(new String[]{"Android POS", "All-in-One POS"});
            CellRangeAddressList range = new CellRangeAddressList(1, 1000, 9, 9);
            XSSFDataValidation validation = (XSSFDataValidation) helper.createValidation(constraint, range);
            validation.setShowErrorBox(true);
            sheet.addValidationData(validation);

            XSSFSheet instructions = wb.createSheet("Instructions");
            String[] notes = {
                    "Bank Lead Entry — Bulk Upload template",
                    "",
                    "Required: Merchant Name, Contact Name, Contact Number, Email, Merchant Address, Pincode, State, City, Device Type",
                    "Optional: Alternate Number, Device Count (default 1)",
                    "",
                    "Contact Number and Alternate Number must be exactly 10 digits.",
                    "Pincode must be exactly 6 digits.",
                    "Device Type must be 'Android POS' or 'All-in-One POS'.",
                    "  • Android POS    → device_model A75PRO",
                    "  • All-in-One POS → device_model Q161_PRO_SQR",
                    "",
                    "Sole ID is taken from the upload screen (your branch as a Branch User, or the picker if Admin).",
                    "Bank information (Bank City, Bank Pincode, Bank Region) auto-fills from the branch table.",
                    "State and City are the merchant's location — enter them per row.",
                    "(Region is sent empty for now; once the Bijlipay pincode API is reachable, it will auto-fill.)",
                    "",
                    "First row is the header. Data starts from row 2.",
                    "Rows are submitted one at a time to the Bijlipay lead API. Failures don't stop the run."
            };
            for (int i = 0; i < notes.length; i++) {
                Row r = instructions.createRow(i);
                r.createCell(0).setCellValue(notes[i]);
            }
            instructions.setColumnWidth(0, 110 * 256);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to build template: " + e.getMessage());
        }
    }

    public LeadBulkParseResponse parse(MultipartFile file, String soleId) {
        if (soleId == null || soleId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Sole ID is required to parse a lead bulk file");
        }
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File must be .xlsx or .xls");
        }

        Branch branch = branchRepository.findBySoleIdIgnoreCase(soleId.trim())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No branch found for Sole ID '" + soleId + "'"));
        if (branch.getStatus() != BranchStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Branch '" + soleId + "' is not active");
        }

        List<LeadBulkRow> rows = parseRows(file);
        int valid = 0;
        for (LeadBulkRow r : rows) if (r.valid()) valid++;
        return new LeadBulkParseResponse(BranchResponse.from(branch), rows.size(), valid, rows.size() - valid, rows);
    }

    private List<LeadBulkRow> parseRows(MultipartFile file) {
        List<LeadBulkRow> result = new ArrayList<>();
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
                result.add(validateRow(r + 1, data));
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse uploaded lead bulk file", e);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Could not read Excel file: " + e.getMessage());
        }
        return result;
    }

    private LeadBulkRow validateRow(int rowNumber, Map<String, String> data) {
        List<String> errors = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        String merchantName = trim(data.get("Merchant Name"));
        String contactName  = trim(data.get("Contact Name"));
        String contactNumber = trim(data.get("Contact Number"));
        String altNumber    = trim(data.get("Alternate Number"));
        String email        = trim(data.get("Email"));
        String address      = trim(data.get("Merchant Address"));
        String pincode      = trim(data.get("Pincode"));
        String state        = trim(data.get("State"));
        String city         = trim(data.get("City"));
        String deviceLabel  = trim(data.get("Device Type"));
        String deviceCountS = trim(data.get("Device Count"));

        if (merchantName.isEmpty()) missing.add("Merchant Name");
        if (contactName.isEmpty())  missing.add("Contact Name");
        if (contactNumber.isEmpty())missing.add("Contact Number");
        if (email.isEmpty())        missing.add("Email");
        if (address.isEmpty())      missing.add("Merchant Address");
        if (pincode.isEmpty())      missing.add("Pincode");
        if (state.isEmpty())        missing.add("State");
        if (city.isEmpty())         missing.add("City");
        if (deviceLabel.isEmpty())  missing.add("Device Type");
        for (String f : missing) errors.add(f + " is required");

        if (!contactNumber.isEmpty() && !contactNumber.matches("\\d{10}")) {
            errors.add("Contact Number must be exactly 10 digits");
        }
        if (!altNumber.isEmpty() && !altNumber.matches("\\d{10}")) {
            errors.add("Alternate Number must be exactly 10 digits");
        }
        if (!email.isEmpty() && !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) {
            errors.add("Email is not a valid email");
        }
        if (!pincode.isEmpty() && !pincode.matches("\\d{6}")) {
            errors.add("Pincode must be exactly 6 digits");
        }

        String deviceModel = "";
        if (!deviceLabel.isEmpty()) {
            String key = deviceLabel.toLowerCase(Locale.ROOT);
            deviceModel = DEVICE_MODELS.get(key);
            if (deviceModel == null) {
                errors.add("Device Type must be 'Android POS' or 'All-in-One POS'");
                deviceModel = "";
            }
        }

        int deviceCount = 1;
        if (!deviceCountS.isEmpty()) {
            try {
                deviceCount = (int) Math.floor(Double.parseDouble(deviceCountS));
                if (deviceCount < 1) {
                    errors.add("Device Count must be at least 1");
                    deviceCount = 1;
                }
            } catch (NumberFormatException nfe) {
                errors.add("Device Count must be a number");
            }
        }

        return new LeadBulkRow(
                rowNumber, data,
                merchantName, contactName, contactNumber, altNumber,
                email, address, pincode, state, city,
                deviceLabel, deviceModel, deviceCount,
                errors, missing,
                errors.isEmpty()
        );
    }

    private Sheet pickSheet(Workbook wb) {
        for (int i = 0; i < wb.getNumberOfSheets(); i++) {
            Sheet s = wb.getSheetAt(i);
            Row h = s.getRow(0);
            if (h == null) continue;
            DataFormatter formatter = new DataFormatter();
            Set<String> headers = new HashSet<>();
            for (Cell c : h) headers.add(formatter.formatCellValue(c).trim());
            if (headers.contains("Merchant Name") && headers.contains("Pincode")) {
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
}
