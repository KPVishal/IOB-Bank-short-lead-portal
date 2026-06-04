package com.bijlipay.iob.user;

import com.bijlipay.iob.branch.Branch;
import com.bijlipay.iob.branch.BranchRepository;
import com.bijlipay.iob.branch.BranchStatus;
import com.bijlipay.iob.common.exception.ApiException;
import com.bijlipay.iob.email.EmailService;
import com.bijlipay.iob.user.dto.UserBulkImportResponse;
import com.bijlipay.iob.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserBulkService {

    public static final String[] HEADERS = {"Sole ID", "User Name", "User Email", "User Number", "Role"};
    private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.user-defaults.password}")
    private String defaultPassword;

    public byte[] buildTemplate() {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XSSFSheet sheet = wb.createSheet("Users");

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
                Cell c = header.createCell(i);
                c.setCellValue(HEADERS[i]);
                c.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 22 * 256);
            }
            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("0023");
            sample.createCell(1).setCellValue("Ravi Kumar");
            sample.createCell(2).setCellValue("ravi.kumar@iob.in");
            sample.createCell(3).setCellValue("9988776655");
            sample.createCell(4).setCellValue("Branch Manager");

            XSSFSheet info = wb.createSheet("Instructions");
            String[] notes = {
                    "Users bulk upload template",
                    "",
                    "Required columns: Sole ID, User Name, User Email, User Number",
                    "Role: defaults to 'Branch Manager' (Admin is not allowed via bulk upload).",
                    "Sole ID must match an existing ACTIVE branch.",
                    "User Number must be exactly 10 digits.",
                    "User Email must be unique and not already in use.",
                    "Each successful user receives a welcome email with a temporary password (Welcome@123).",
                    "The user will be asked to change their password on first login.",
                    "First row is the header. Data starts from row 2."
            };
            for (int i = 0; i < notes.length; i++) {
                info.createRow(i).createCell(0).setCellValue(notes[i]);
            }
            info.setColumnWidth(0, 110 * 256);

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to build template: " + e.getMessage());
        }
    }

    public UserBulkImportResponse bulkImport(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File must be .xlsx or .xls");
        }

        List<ParsedRow> rows = parseRows(file);
        Set<String> emailsInFile = new HashSet<>();
        List<UserResponse> imported = new ArrayList<>();
        List<UserBulkImportResponse.FailedRow> failed = new ArrayList<>();

        for (ParsedRow row : rows) {
            List<String> errors = new ArrayList<>();
            List<String> missing = new ArrayList<>();

            String soleId   = trim(row.data.get("Sole ID"));
            String userName = trim(row.data.get("User Name"));
            String email    = trim(row.data.get("User Email"));
            String mobile   = trim(row.data.get("User Number")).replaceAll("[^\\d]", "");
            String role     = trim(row.data.get("Role"));

            if (soleId.isEmpty())   missing.add("Sole ID");
            if (userName.isEmpty()) missing.add("User Name");
            if (email.isEmpty())    missing.add("User Email");
            if (mobile.isEmpty())   missing.add("User Number");
            for (String m : missing) errors.add(m + " is required");

            if (!email.isEmpty() && !EMAIL.matcher(email).matches()) {
                errors.add("User Email is not a valid email address");
            }
            if (!mobile.isEmpty() && !mobile.matches("\\d{10}")) {
                errors.add("User Number must be exactly 10 digits");
            }
            if (!role.isEmpty() && !role.equalsIgnoreCase("Branch Manager") && !role.equalsIgnoreCase("BRANCH_MANAGER")) {
                errors.add("Role must be 'Branch Manager'");
            }

            Branch branch = null;
            if (!soleId.isEmpty()) {
                branch = branchRepository.findBySoleIdIgnoreCase(soleId).orElse(null);
                if (branch == null) {
                    errors.add("Sole ID '" + soleId + "' does not match any branch");
                } else if (branch.getStatus() == BranchStatus.INACTIVE) {
                    errors.add("Branch for Sole ID '" + soleId + "' is inactive");
                }
            }

            if (!email.isEmpty()) {
                if (!emailsInFile.add(email.toLowerCase(Locale.ROOT))) {
                    errors.add("Email '" + email + "' is duplicated in this file");
                } else if (userRepository.existsByEmailIgnoreCase(email)) {
                    errors.add("Email '" + email + "' already exists");
                }
            }

            if (!errors.isEmpty()) {
                failed.add(new UserBulkImportResponse.FailedRow(row.rowNumber, row.data, errors, missing));
                continue;
            }

            try {
                User saved = userRepository.save(User.builder()
                        .email(email)
                        .passwordHash(passwordEncoder.encode(defaultPassword))
                        .role(Role.BRANCH_MANAGER)
                        .status(UserStatus.ACTIVE)
                        .displayName(userName)
                        .mobile(mobile)
                        .soleId(branch.getSoleId())
                        .mustChangePassword(true)
                        .build());

                imported.add(UserResponse.from(saved, branch.getBranchName(), branch.getCity(), branch.getState()));
                emailService.sendWelcomeEmail(saved.getEmail(), saved.getDisplayName(),
                        branch.getSoleId(), branch.getBranchName());
            } catch (Exception e) {
                log.warn("Bulk import row {} save failed", row.rowNumber, e);
                failed.add(new UserBulkImportResponse.FailedRow(
                        row.rowNumber, row.data, List.of("Database error: " + e.getMessage()), List.of()));
            }
        }

        return new UserBulkImportResponse(rows.size(), imported.size(), failed.size(), imported, failed);
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
            DataFormatter f = new DataFormatter();
            Set<String> set = new HashSet<>();
            for (Cell c : h) set.add(f.formatCellValue(c).trim());
            if (set.contains("Sole ID") && set.contains("User Email")) return s;
        }
        return null;
    }

    private Map<Integer, String> readHeader(Sheet sheet) {
        Map<Integer, String> map = new LinkedHashMap<>();
        Row header = sheet.getRow(0);
        DataFormatter f = new DataFormatter();
        for (Cell c : header) {
            String label = f.formatCellValue(c).trim();
            if (!label.isEmpty()) map.put(c.getColumnIndex(), label);
        }
        return map;
    }

    private boolean isRowBlank(Row row, DataFormatter f) {
        for (Cell c : row) {
            if (c != null && !f.formatCellValue(c).trim().isEmpty()) return false;
        }
        return true;
    }

    private static String trim(String s) { return s == null ? "" : s.trim(); }

    private record ParsedRow(int rowNumber, Map<String, String> data) {}
}
