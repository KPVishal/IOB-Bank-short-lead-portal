package com.bijlipay.iob.common.exception;

public record ApiError(String timestamp, int status, String message) {}
