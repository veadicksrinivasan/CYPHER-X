package com.cypherx.model;

import java.util.List;
import java.util.Map;

public class BlastRadiusResponse {
    // Nodes reachable from source before isolation
    private List<String> reachableBefore;
    // Nodes reachable after isolation (if any)
    private List<String> reachableAfter;
    // Simple representation of paths: each path is a list of node ids from source to a reachable node
    private List<List<String>> pathsBefore;
    private List<List<String>> pathsAfter;
    // Summary counts
    private int countBefore;
    private int countAfter;

    public BlastRadiusResponse() {}

    public List<String> getReachableBefore() {
        return reachableBefore;
    }

    public void setReachableBefore(List<String> reachableBefore) {
        this.reachableBefore = reachableBefore;
    }

    public List<String> getReachableAfter() {
        return reachableAfter;
    }

    public void setReachableAfter(List<String> reachableAfter) {
        this.reachableAfter = reachableAfter;
    }

    public List<List<String>> getPathsBefore() {
        return pathsBefore;
    }

    public void setPathsBefore(List<List<String>> pathsBefore) {
        this.pathsBefore = pathsBefore;
    }

    public List<List<String>> getPathsAfter() {
        return pathsAfter;
    }

    public void setPathsAfter(List<List<String>> pathsAfter) {
        this.pathsAfter = pathsAfter;
    }

    public int getCountBefore() {
        return countBefore;
    }

    public void setCountBefore(int countBefore) {
        this.countBefore = countBefore;
    }

    public int getCountAfter() {
        return countAfter;
    }

    public void setCountAfter(int countAfter) {
        this.countAfter = countAfter;
    }
}

