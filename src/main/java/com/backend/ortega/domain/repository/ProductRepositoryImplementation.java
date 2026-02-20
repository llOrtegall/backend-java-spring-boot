package com.backend.ortega.domain.repository;

import java.util.List;

import com.backend.ortega.domain.dto.ProductDTO;

public interface ProductRepositoryImplementation {
    List<ProductDTO> findAllProducts();
}
