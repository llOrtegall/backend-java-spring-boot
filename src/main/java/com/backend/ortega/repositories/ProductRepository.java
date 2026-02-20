package com.backend.ortega.repositories;

import com.backend.ortega.entities.Product;
import org.springframework.data.repository.CrudRepository;

public interface ProductRepository extends CrudRepository<Product , Long> {
}
