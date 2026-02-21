package com.backend.ortega.domain.dto;

public record ProductDTO(
    Long id,
    String nombre,
    String descripcion,
    Double precio) {
}
