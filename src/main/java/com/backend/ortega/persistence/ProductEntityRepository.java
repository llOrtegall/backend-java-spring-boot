package com.backend.ortega.persistence;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.backend.ortega.domain.dto.ProductDTO;
import com.backend.ortega.domain.repository.ProductRepositoryImplementation;
import com.backend.ortega.persistence.crud.CrudProductEntity;
import com.backend.ortega.persistence.entities.ProductEntity;
import com.backend.ortega.persistence.mapper.ProductMapper;

@Repository
public class ProductEntityRepository implements ProductRepositoryImplementation{

    private final CrudProductEntity crudProduct;
    private final ProductMapper productMapper;

    public ProductEntityRepository (CrudProductEntity crudProduct, ProductMapper productMapper){
        this.crudProduct = crudProduct;
        this.productMapper = productMapper;
    }

    @Override
    public List<ProductDTO> findAllProducts() {
        return this.productMapper.toDtos(this.crudProduct.findAll());
    }

    @Override
    public ProductDTO save(ProductDTO product) {
        ProductEntity productEntity = this.productMapper.toEntity(product);
        
        return this.productMapper.toDto(this.crudProduct.save(productEntity));
    }

    @Override
    public ProductDTO findById(Long id) {
        return this.productMapper.toDto(this.crudProduct.findById(id).orElse(null));
    }

    @Override
    public ProductDTO update(Long id, ProductDTO updated) {
        ProductEntity producEntity = this.crudProduct.findById(id).orElse(null);

        if(producEntity == null) return null;

        this.productMapper.updateEntityFromDto(updated, producEntity);

        ProductEntity productUpdated = this.crudProduct.save(producEntity);

        return this.productMapper.toDto(productUpdated);
    }


}
