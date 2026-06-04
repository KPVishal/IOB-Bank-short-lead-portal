package com.bijlipay.iob.reference;

import com.bijlipay.iob.reference.dto.CityRef;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reference")
@RequiredArgsConstructor
public class ReferenceController {

    private final ReferenceService referenceService;

    @GetMapping("/states")
    public List<String> states() {
        return referenceService.listStates();
    }

    @GetMapping("/cities")
    public List<CityRef> cities(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String state,
            @RequestParam(required = false, defaultValue = "50") int limit
    ) {
        return referenceService.searchCities(q, state, limit);
    }
}
