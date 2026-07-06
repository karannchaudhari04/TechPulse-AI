package com.techpulse.agent;

/**
 * Common functional interface representing a single responsibility modular agent.
 *
 * @param <I> Input type
 * @param <O> Output type
 */
@FunctionalInterface
public interface Agent<I, O> {
    O process(I input);
}
