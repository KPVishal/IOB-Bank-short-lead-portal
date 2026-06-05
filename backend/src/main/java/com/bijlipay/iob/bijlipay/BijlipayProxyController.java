package com.bijlipay.iob.bijlipay;

import com.bijlipay.iob.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;
import java.util.function.Supplier;

/**
 * Proxies the seven Bijlipay (Skilworth Mars) endpoints used by this portal.
 *
 * <p>Why a proxy?
 * <ul>
 *   <li>Bijlipay QA at {@code qaapp.bijlipay.co.in:8353} is IP-whitelisted. If
 *       every developer laptop or office network had to be whitelisted, that
 *       would never end. Routing every call through the AWS EC2 box means
 *       only one IP (the EC2 public IP) needs to be on the allow-list.</li>
 *   <li>The frontend lives at the same origin as this Spring backend, so the
 *       browser never sees a cross-origin request. No CORS to fight.</li>
 *   <li>If the portal moves to HTTPS later, this proxy keeps the plain-HTTP
 *       Bijlipay connection on the server side, dodging mixed-content blocks.</li>
 *   <li>Every Bijlipay call is now JWT-protected (Spring Security default-deny
 *       covers {@code /api/**}), so an attacker can't hit Bijlipay through us
 *       without first authenticating to the portal.</li>
 * </ul>
 *
 * <p>The proxy is intentionally thin — it forwards JSON bodies / query params
 * 1-for-1 and returns whatever Bijlipay returned. Status codes propagate so a
 * Bijlipay 4xx surfaces as the same 4xx to the browser. Network/timeout errors
 * surface as HTTP 502 with a clear message.
 */
@RestController
@RequestMapping("/api/bijlipay")
@RequiredArgsConstructor
@Slf4j
public class BijlipayProxyController {

    private final RestClient bijlipayRestClient;

    // ── Reference lookups ────────────────────────────────────────────────

    @GetMapping("/fetchPinCodeList")
    public ResponseEntity<String> fetchPinCodeList(@RequestParam("searchTerm") String searchTerm) {
        return forward(() -> bijlipayRestClient.get()
                .uri(uri -> uri.path("/api/fetchPinCodeList")
                        .queryParam("searchTerm", searchTerm)
                        .build())
                .retrieve()
                .toEntity(String.class));
    }

    @GetMapping("/fetchBpRegionDetailsBasedOnPincode/{pincode}")
    public ResponseEntity<String> fetchBpRegionDetailsBasedOnPincode(@PathVariable("pincode") String pincode) {
        return forward(() -> bijlipayRestClient.get()
                .uri("/api/fetchBpRegionDetailsBasedOnPincode/{p}", Map.of("p", pincode))
                .retrieve()
                .toEntity(String.class));
    }

    // ── Lead submission ──────────────────────────────────────────────────

    @PostMapping("/directBank-short-lead/1")
    public ResponseEntity<String> directBankShortLead(@RequestBody String body) {
        return forward(() -> bijlipayRestClient.post()
                .uri("/api/directBank-short-lead/1")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toEntity(String.class));
    }

    // ── Lead status (pipeline view) ──────────────────────────────────────

    @GetMapping("/lead-view-tracker")
    public ResponseEntity<String> branchLeadStatus(
            @RequestParam("bankEmpPh") String bankEmpPh,
            @RequestParam("leadSource") String leadSource
    ) {
        return forward(() -> bijlipayRestClient.get()
                .uri(uri -> uri.path("/api/lead-view-tracker")
                        .queryParam("bankEmpPh", bankEmpPh)
                        .queryParam("leadSource", leadSource)
                        .build())
                .retrieve()
                .toEntity(String.class));
    }

    @GetMapping("/lead-view-tracker-admin")
    public ResponseEntity<String> adminLeadStatus(
            @RequestParam("leadSource") String leadSource,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        return forward(() -> bijlipayRestClient.get()
                .uri(uri -> uri.path("/api/lead-view-tracker-admin")
                        .queryParam("leadSource", leadSource)
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .retrieve()
                .toEntity(String.class));
    }

    // ── Terminal status (device-level view) ──────────────────────────────

    @GetMapping("/lead-device-details")
    public ResponseEntity<String> branchTerminalStatus(
            @RequestParam("leadSource") String leadSource,
            @RequestParam("bankEmpPh") String bankEmpPh,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        return forward(() -> bijlipayRestClient.get()
                .uri(uri -> uri.path("/api/lead-device-details")
                        .queryParam("leadSource", leadSource)
                        .queryParam("bankEmpPh", bankEmpPh)
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .retrieve()
                .toEntity(String.class));
    }

    @GetMapping("/lead-device-details-admin")
    public ResponseEntity<String> adminTerminalStatus(
            @RequestParam("leadSource") String leadSource,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        return forward(() -> bijlipayRestClient.get()
                .uri(uri -> uri.path("/api/lead-device-details-admin")
                        .queryParam("leadSource", leadSource)
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .retrieve()
                .toEntity(String.class));
    }

    // ── Centralised error mapping ────────────────────────────────────────

    private ResponseEntity<String> forward(Supplier<ResponseEntity<String>> call) {
        try {
            ResponseEntity<String> resp = call.get();
            HttpStatusCode code = resp.getStatusCode();
            // Propagate Bijlipay's body and status; force JSON content-type so the browser parses it.
            return ResponseEntity.status(code)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(resp.getBody());
        } catch (RestClientResponseException upstream4xx5xx) {
            // Bijlipay answered with an error status. Pass it through verbatim.
            log.warn("Bijlipay upstream returned {}: {}",
                    upstream4xx5xx.getStatusCode(), upstream4xx5xx.getResponseBodyAsString());
            return ResponseEntity.status(upstream4xx5xx.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(upstream4xx5xx.getResponseBodyAsString());
        } catch (ResourceAccessException network) {
            log.warn("Bijlipay upstream unreachable: {}", network.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Bijlipay upstream is unreachable. " +
                    "Verify the EC2 public IP is whitelisted on Bijlipay's QA firewall.");
        } catch (Exception e) {
            log.error("Unexpected error proxying to Bijlipay", e);
            throw new ApiException(HttpStatus.BAD_GATEWAY,
                    "Bijlipay proxy error: " + e.getMessage());
        }
    }
}
