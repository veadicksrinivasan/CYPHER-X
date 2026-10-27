package com.cypherx.model;

import java.util.List;

public class BlastRadiusRequest {
    private String sourceNodeId;
    private List<InfrastructureNode> nodes;
    private List<DependencyEdge> edges;
    private List<String> isolateNodeIds; // optional, can be null or empty

    public BlastRadiusRequest() {}

    public String getSourceNodeId() {
        return sourceNodeId;
    }

    public void setSourceNodeId(String sourceNodeId) {
        this.sourceNodeId = sourceNodeId;
    }

    public List<InfrastructureNode> getNodes() {
        return nodes;
    }

    public void setNodes(List<InfrastructureNode> nodes) {
        this.nodes = nodes;
    }

    public List<DependencyEdge> getEdges() {
        return edges;
    }

    public void setEdges(List<DependencyEdge> edges) {
        this.edges = edges;
    }

    public List<String> getIsolateNodeIds() {
        return isolateNodeIds;
    }

    public void setIsolateNodeIds(List<String> isolateNodeIds) {
        this.isolateNodeIds = isolateNodeIds;
    }
}

