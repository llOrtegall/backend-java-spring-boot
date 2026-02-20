package com.backend.ortega.controllers;

import com.backend.ortega.entities.Product;
import com.backend.ortega.services.ProductServices;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
public class ProductController {
    final private ProductServices productservice;

    public ProductController(ProductServices productServices) {
        this.productservice = productServices;
    }

    @GetMapping
    public ResponseEntity<List<Product>> list() {
        return ResponseEntity.ok(productservice.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> details(@PathVariable Long id) {
        Optional<Product> product = productservice.findById(id);

        if(product.isPresent()){
            return  ResponseEntity.ok(product.orElseThrow());
        }

        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Product> create(@RequestBody Product product) {
        return  ResponseEntity.status(HttpStatus.CREATED).body(productservice.save(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> update(@RequestBody Product product, @PathVariable Long id) {
        Optional<Product> existingProduct = productservice.findById(id);

        if(existingProduct.isPresent()){
            Product productDb = existingProduct.orElseThrow();

            productDb.setName(product.getName());
            productDb.setDescription(product.getDescription());
            productDb.setPrice(product.getPrice());

            return ResponseEntity.ok(productservice.save(productDb));
        }

        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Optional<Product> existingProduct = productservice.findById(id);

        if(existingProduct.isPresent()){
            productservice.deleteById(id);
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.notFound().build();
    }
}
