package com.cypherx.controller;

import com.cypherx.model.BlastRadiusRequest;
import com.cypherx.model.BlastRadiusResponse;
import com.cypherx.service.BlastRadiusService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BlastRadiusController {

    private final BlastRadiusService service;

    public BlastRadiusController(BlastRadiusService service) {
        this.service = service;
    }

    @PostMapping("/api/blast-radius/simulate")
    public ResponseEntity<BlastRadiusResponse> simulate(@RequestBody BlastRadiusRequest request) {
        BlastRadiusResponse resp = service.simulate(request);
        return ResponseEntity.ok(resp);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }
}

