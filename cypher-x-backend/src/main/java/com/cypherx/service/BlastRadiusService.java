package com.cypherx.service;

import com.cypherx.model.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BlastRadiusService {
    /**
     * Simulate blast radius for a given request.
     * Returns reachable nodes and paths before and after isolation.
     */
    public BlastRadiusResponse simulate(BlastRadiusRequest request) {
        // Basic validation
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        List<InfrastructureNode> nodes = Objects.requireNonNullElse(request.getNodes(), Collections.emptyList());
        List<DependencyEdge> edges = Objects.requireNonNullElse(request.getEdges(), Collections.emptyList());
        String source = request.getSourceNodeId();
        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException("sourceNodeId is required");
        }
        // check duplicate node ids
        Set<String> ids = new HashSet<>();
        for (InfrastructureNode n : nodes) {
            if (!ids.add(n.getId())) {
                throw new IllegalArgumentException("Duplicate node id: " + n.getId());
            }
        }
        if (!ids.contains(source)) {
            throw new IllegalArgumentException("sourceNodeId not found among nodes: " + source);
        }
        // validate edges reference known nodes
        for (DependencyEdge e : edges) {
            if (!ids.contains(e.getFromNodeId())) {
                throw new IllegalArgumentException("Edge from unknown node: " + e.getFromNodeId());
            }
            if (!ids.contains(e.getToNodeId())) {
                throw new IllegalArgumentException("Edge to unknown node: " + e.getToNodeId());
            }
        }
        // validate isolate ids
        Set<String> isolateSet = new HashSet<>();
        if (request.getIsolateNodeIds() != null) {
            for (String iso : request.getIsolateNodeIds()) {
                if (!ids.contains(iso)) {
                    throw new IllegalArgumentException("Isolate node id not found: " + iso);
                }
                isolateSet.add(iso);
            }
        }
        // Build adjacency list (directed)
        Map<String, List<String>> adjacency = new HashMap<>();
        for (String id : ids) {
            adjacency.put(id, new ArrayList<>());
        }
        for (DependencyEdge e : edges) {
            adjacency.get(e.getFromNodeId()).add(e.getToNodeId());
        }
        // Compute before and after
        Result before = computeReachable(source, adjacency, Collections.emptySet());
        Result after = computeReachable(source, adjacency, isolateSet);
        // Build response
        BlastRadiusResponse resp = new BlastRadiusResponse();
        resp.setReachableBefore(new ArrayList<>(before.reachable));
        resp.setReachableAfter(new ArrayList<>(after.reachable));
        resp.setPathsBefore(before.paths);
        resp.setPathsAfter(after.paths);
        resp.setCountBefore(before.reachable.size());
        resp.setCountAfter(after.reachable.size());
        return resp;
    }

    /** Helper holder for traversal result */
    private static class Result {
        Set<String> reachable = new LinkedHashSet<>(); // preserve order of discovery
        List<List<String>> paths = new ArrayList<>();
    }

    /**
     * Bread‑first traversal that respects a set of isolated nodes.
     * The isolated nodes are completely removed from the graph (both incoming and outgoing edges).
     */
    private Result computeReachable(String source, Map<String, List<String>> adjacency, Set<String> isolated) {
        Result result = new Result();
        if (isolated.contains(source)) {
            // source itself is isolated – nothing reachable
            return result;
        }
        Deque<List<String>> queue = new ArrayDeque<>();
        queue.add(Collections.singletonList(source));
        while (!queue.isEmpty()) {
            List<String> path = queue.poll();
            String node = path.get(path.size() - 1);
            if (result.reachable.contains(node)) {
                continue; // already visited
            }
            result.reachable.add(node);
            result.paths.add(new ArrayList<>(path));
            // expand neighbours unless they are isolated
            for (String neigh : adjacency.getOrDefault(node, Collections.emptyList())) {
                if (isolated.contains(neigh)) {
                    continue;
                }
                // create new path for neighbour
                List<String> newPath = new ArrayList<>(path);
                newPath.add(neigh);
                queue.add(newPath);
            }
        }
        return result;
    }
}

