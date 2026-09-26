def test_orchestrator_imports():
    import app.graph.orchestrator

    assert hasattr(app.graph.orchestrator, "_GRAPH")
