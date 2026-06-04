package com.bijlipay.iob;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IobPortalApplication {
    public static void main(String[] args) {
        SpringApplication.run(IobPortalApplication.class, args);
    }
}
