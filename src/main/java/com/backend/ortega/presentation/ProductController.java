package com.backend.ortega.presentation;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.ortega.domain.dto.ProductDTO;
import com.backend.ortega.domain.service.ProductService;

@RestController
@RequestMapping("/products")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService){
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductDTO>> getAllCtrl(){
        return ResponseEntity.ok(this.productService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getByIdCtrl(@PathVariable Long id){
        ProductDTO product = this.productService.getById(id);

        if(product == null){
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> updateCtrl(@PathVariable Long id, @RequestBody ProductDTO productDTO){
        return ResponseEntity.ok(this.productService.update(id, productDTO));
    }

    @PostMapping
    public ResponseEntity<ProductDTO> createCtrl(@RequestBody ProductDTO product){
        return ResponseEntity.status(HttpStatus.CREATED).body(this.productService.save(product));     
    }
}
