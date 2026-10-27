package com.cypherx.service;

import com.cypherx.model.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

class BlastRadiusServiceTest {
    private final BlastRadiusService service = new BlastRadiusService();

    private BlastRadiusRequest buildRequest(String source, List<InfrastructureNode> nodes, List<DependencyEdge> edges, List<String> isolate) {
        BlastRadiusRequest req = new BlastRadiusRequest();
        req.setSourceNodeId(source);
        req.setNodes(nodes);
        req.setEdges(edges);
        req.setIsolateNodeIds(isolate);
        return req;
    }

    @Test
    void simpleChain() {
        // A -> B -> C
        List<InfrastructureNode> nodes = List.of(
                new InfrastructureNode("A", "A"),
                new InfrastructureNode("B", "B"),
                new InfrastructureNode("C", "C")
        );
        List<DependencyEdge> edges = List.of(
                new DependencyEdge("A", "B"),
                new DependencyEdge("B", "C")
        );
        BlastRadiusRequest req = buildRequest("A", nodes, edges, null);
        BlastRadiusResponse resp = service.simulate(req);
        assertEquals(Set.of("A","B","C"), new HashSet<>(resp.getReachableBefore()));
        assertEquals(3, resp.getCountBefore());
        assertEquals(3, resp.getCountAfter()); // no isolation
    }

    @Test
    void branchingGraph() {
        // A -> B, A -> C, B -> D, C -> D
        List<InfrastructureNode> nodes = List.of(
                new InfrastructureNode("A","A"),
                new InfrastructureNode("B","B"),
                new InfrastructureNode("C","C"),
                new InfrastructureNode("D","D")
        );
        List<DependencyEdge> edges = List.of(
                new DependencyEdge("A","B"),
                new DependencyEdge("A","C"),
                new DependencyEdge("B","D"),
                new DependencyEdge("C","D")
        );
        BlastRadiusRequest req = buildRequest("A", nodes, edges, null);
        BlastRadiusResponse resp = service.simulate(req);
        assertEquals(Set.of("A","B","C","D"), new HashSet<>(resp.getReachableBefore()));
        assertEquals(4, resp.getCountBefore());
    }

    @Test
    void graphWithCycle() {
        // A -> B -> C -> A (cycle) and C -> D
        List<InfrastructureNode> nodes = List.of(
                new InfrastructureNode("A","A"),
                new InfrastructureNode("B","B"),
                new InfrastructureNode("C","C"),
                new InfrastructureNode("D","D")
        );
        List<DependencyEdge> edges = List.of(
                new DependencyEdge("A","B"),
                new DependencyEdge("B","C"),
                new DependencyEdge("C","A"),
                new DependencyEdge("C","D")
        );
        BlastRadiusRequest req = buildRequest("A", nodes, edges, null);
        BlastRadiusResponse resp = service.simulate(req);
        assertEquals(Set.of("A","B","C","D"), new HashSet<>(resp.getReachableBefore()));
        assertEquals(4, resp.getCountBefore());
    }

    @Test
    void disconnectedComponents() {
        // A -> B,   X -> Y (disconnected from source A)
        List<InfrastructureNode> nodes = List.of(
                new InfrastructureNode("A","A"),
                new InfrastructureNode("B","B"),
                new InfrastructureNode("X","X"),
                new InfrastructureNode("Y","Y")
        );
        List<DependencyEdge> edges = List.of(
                new DependencyEdge("A","B"),
                new DependencyEdge("X","Y")
        );
        BlastRadiusRequest req = buildRequest("A", nodes, edges, null);
        BlastRadiusResponse resp = service.simulate(req);
        assertEquals(Set.of("A","B"), new HashSet<>(resp.getReachableBefore()));
    }

    @Test
    void isolationSimulation() {
        // A -> B -> C, isolate B
        List<InfrastructureNode> nodes = List.of(
                new InfrastructureNode("A","A"),
                new InfrastructureNode("B","B"),
                new InfrastructureNode("C","C")
        );
        List<DependencyEdge> edges = List.of(
                new DependencyEdge("A","B"),
                new DependencyEdge("B","C")
        );
        BlastRadiusRequest req = buildRequest("A", nodes, edges, List.of("B"));
        BlastRadiusResponse resp = service.simulate(req);
        // before should have A,B,C
        assertEquals(Set.of("A","B","C"), new HashSet<>(resp.getReachableBefore()));
        // after isolation of B should only have A (B and C removed)
        assertEquals(Set.of("A"), new HashSet<>(resp.getReachableAfter()));
        assertEquals(1, resp.getCountAfter());
    }

    @Test
    void invalidDuplicateNodeId() {
        List<InfrastructureNode> nodes = List.of(
                new InfrastructureNode("A","A"),
                new InfrastructureNode("A","A2")
        );
        BlastRadiusRequest req = buildRequest("A", nodes, Collections.emptyList(), null);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.simulate(req));
        assertTrue(ex.getMessage().contains("Duplicate node id"));
    }

    @Test
    void invalidEdgeReference() {
        List<InfrastructureNode> nodes = List.of(
                new InfrastructureNode("A","A"),
                new InfrastructureNode("B","B")
        );
        List<DependencyEdge> edges = List.of(new DependencyEdge("A","C")); // C unknown
        BlastRadiusRequest req = buildRequest("A", nodes, edges, null);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.simulate(req));
        assertTrue(ex.getMessage().contains("Edge to unknown node"));
    }
}

