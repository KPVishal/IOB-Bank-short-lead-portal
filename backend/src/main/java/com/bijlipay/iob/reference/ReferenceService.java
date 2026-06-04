package com.bijlipay.iob.reference;

import com.bijlipay.iob.reference.dto.CityRef;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ReferenceService {

    private List<String> states = List.of();
    private List<CityRef> cities = List.of();
    private Map<String, String> stateLookup = Map.of();

    @PostConstruct
    void load() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        try (InputStream is = new ClassPathResource("data/states.json").getInputStream()) {
            states = mapper.readValue(is, new TypeReference<List<String>>() {});
        }
        try (InputStream is = new ClassPathResource("data/cities.json").getInputStream()) {
            cities = mapper.readValue(is, new TypeReference<List<CityRef>>() {});
        }
        stateLookup = states.stream()
                .collect(Collectors.toUnmodifiableMap(s -> s.toLowerCase(Locale.ROOT), s -> s));
        log.info("Reference data loaded: {} states, {} cities", states.size(), cities.size());
    }

    public List<String> listStates() {
        return states;
    }

    public List<CityRef> searchCities(String query, String state, int limit) {
        String q = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String stateFilter = (state == null || state.isBlank()) ? null : state.trim().toLowerCase(Locale.ROOT);
        int cap = limit <= 0 ? 50 : Math.min(limit, 500);
        return cities.stream()
                .filter(c -> stateFilter == null || c.state().toLowerCase(Locale.ROOT).equals(stateFilter))
                .filter(c -> q.isEmpty() || c.name().toLowerCase(Locale.ROOT).contains(q))
                .sorted(Comparator.comparing(CityRef::name))
                .limit(cap)
                .toList();
    }

    /** Returns the canonical state name (matching case), or null if not recognized. */
    public String canonicalState(String input) {
        if (input == null) return null;
        return stateLookup.get(input.trim().toLowerCase(Locale.ROOT));
    }
}
