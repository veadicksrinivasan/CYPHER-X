package com.cypherx.controller;

import com.cypherx.model.*;
import com.cypherx.service.BlastRadiusService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class BlastRadiusControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper mapper = new ObjectMapper();

    private BlastRadiusRequest validRequest() {
        BlastRadiusRequest req = new BlastRadiusRequest();
        req.setSourceNodeId("A");
        req.setNodes(List.of(
                new InfrastructureNode("A", "Web"),
                new InfrastructureNode("B", "App"),
                new InfrastructureNode("C", "DB")
        ));
        req.setEdges(List.of(
                new DependencyEdge("A", "B"),
                new DependencyEdge("B", "C")
        ));
        return req;
    }

    @Test
    void simulateValidRequest_returns200AndJson() throws Exception {
        BlastRadiusRequest req = validRequest();
        mockMvc.perform(post("/api/blast-radius/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.reachableBefore", containsInAnyOrder("A", "B", "C")))
                .andExpect(jsonPath("$.countBefore", is(3)))
                .andExpect(jsonPath("$.reachableAfter", containsInAnyOrder("A", "B", "C")))
                .andExpect(jsonPath("$.countAfter", is(3)));
    }

    @Test
    void simulateInvalidDuplicateNode_returns400() throws Exception {
        BlastRadiusRequest req = new BlastRadiusRequest();
        req.setSourceNodeId("A");
        req.setNodes(List.of(
                new InfrastructureNode("A", "Web"),
                new InfrastructureNode("A", "Dup")
        ));
        req.setEdges(List.of());
        mockMvc.perform(post("/api/blast-radius/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Duplicate node id")));
    }
}

