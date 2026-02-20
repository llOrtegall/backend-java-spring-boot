package com.backend.ortega.domain.dto;

public record ProductDTO(
    Long id,
    String name,
    String description,
    Double price) {
}
