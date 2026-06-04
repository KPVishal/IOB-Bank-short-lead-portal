package com.bijlipay.iob.user;

import com.bijlipay.iob.branch.Branch;
import com.bijlipay.iob.branch.BranchRepository;
import com.bijlipay.iob.branch.BranchStatus;
import com.bijlipay.iob.common.dto.PageResponse;
import com.bijlipay.iob.common.exception.ApiException;
import com.bijlipay.iob.email.EmailService;
import com.bijlipay.iob.user.dto.UserCreateRequest;
import com.bijlipay.iob.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.user-defaults.password}")
    private String defaultPassword;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(String q, String city, String state, int page, int size) {
        List<String> matchingSoleIds = null;
        if ((city != null && !city.isBlank()) || (state != null && !state.isBlank())) {
            matchingSoleIds = branchRepository.findAll().stream()
                    .filter(b -> city == null || city.isBlank()
                            || b.getCity().equalsIgnoreCase(city.trim()))
                    .filter(b -> state == null || state.isBlank()
                            || b.getState().equalsIgnoreCase(state.trim()))
                    .map(Branch::getSoleId)
                    .toList();
            if (matchingSoleIds.isEmpty()) {
                return new PageResponse<>(List.of(), Math.max(0, page), Math.min(Math.max(1, size), 200), 0, 0);
            }
        }

        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(Math.max(1, size), 200),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<User> result = userRepository.findAll(
                UserSpecifications.matches(q, matchingSoleIds, Role.BRANCH_MANAGER),
                pageable
        );

        Map<String, Branch> branchBySole = lookupBranches(result.getContent().stream()
                .map(User::getSoleId).filter(java.util.Objects::nonNull).toList());

        return PageResponse.of(result, u -> enrich(u, branchBySole));
    }

    @Transactional
    public UserResponse create(UserCreateRequest req) {
        String soleId = req.soleId().trim();
        String email = req.email().trim();

        Branch branch = branchRepository.findBySoleIdIgnoreCase(soleId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                        "Sole ID '" + soleId + "' does not match any branch"));
        if (branch.getStatus() == BranchStatus.INACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Branch '" + branch.getBranchName() + "' (Sole ID " + branch.getSoleId() + ") is inactive");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "A user with email '" + email + "' already exists");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(defaultPassword))
                .role(Role.BRANCH_MANAGER)
                .status(UserStatus.ACTIVE)
                .displayName(req.userName().trim())
                .mobile(req.mobile().trim())
                .soleId(branch.getSoleId())
                .mustChangePassword(true)
                .build();
        User saved = userRepository.save(user);

        emailService.sendWelcomeEmail(saved.getEmail(), saved.getDisplayName(),
                branch.getSoleId(), branch.getBranchName());

        return UserResponse.from(saved, branch.getBranchName(), branch.getCity(), branch.getState());
    }

    public Map<String, Branch> lookupBranches(Collection<String> soleIds) {
        if (soleIds == null || soleIds.isEmpty()) return Map.of();
        List<String> distinct = soleIds.stream()
                .filter(java.util.Objects::nonNull)
                .map(s -> s.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
        return branchRepository.findAll().stream()
                .filter(b -> distinct.contains(b.getSoleId().toLowerCase(Locale.ROOT)))
                .sorted(Comparator.comparing(Branch::getSoleId))
                .collect(Collectors.toUnmodifiableMap(b -> b.getSoleId().toLowerCase(Locale.ROOT), Function.identity(), (a, b) -> a));
    }

    public UserResponse enrich(User u, Map<String, Branch> branchBySole) {
        Branch b = u.getSoleId() == null ? null : branchBySole.get(u.getSoleId().toLowerCase(Locale.ROOT));
        if (b != null) {
            return UserResponse.from(u, b.getBranchName(), b.getCity(), b.getState());
        }
        return UserResponse.from(u, null, null, null);
    }
}
