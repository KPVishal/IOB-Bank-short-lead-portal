package com.bijlipay.iob.bijlipay;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Wires a {@link RestClient} preconfigured to talk to the Bijlipay upstream
 * (default <code>http://qaapp.bijlipay.co.in:8353</code>).
 *
 * <p>The proxy controller delegates every outbound call through this client
 * so connection/read timeouts and the base URL stay in one place. The default
 * timeouts are intentionally generous because the Bijlipay QA endpoints have
 * been observed to take several seconds when under load — but short enough
 * that an unreachable host (e.g. firewall drop) surfaces within ~15 seconds
 * instead of hanging the request thread.
 */
@Configuration
public class BijlipayProxyConfig {

    @Bean
    public RestClient bijlipayRestClient(
            @Value("${app.bijlipay.base-url}") String baseUrl,
            @Value("${app.bijlipay.connect-timeout-ms}") int connectTimeoutMs,
            @Value("${app.bijlipay.read-timeout-ms}") int readTimeoutMs
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }
}
