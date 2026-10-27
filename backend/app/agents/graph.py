from __future__ import annotations

from langgraph.graph import END, StateGraph

from app.agents.extractor import extractor_step_node, finalize_extractor_trace
from app.agents.planner import planner_node
from app.agents.reasoning import qa_node
from app.models.state import GraphState, PlanSteps


def _after_planner(state: GraphState) -> str:
    if state.get("awaiting_human_input"):
        return "pause"
    return "extractor"


def _after_extractor(state: GraphState) -> str:
    plan = state.get("plan")
    n = len(plan.sub_questions) if isinstance(plan, PlanSteps) else 0
    if int(state.get("current_step_index") or 0) < n:
        return "extractor"
    return "finalize_extractor"


def build_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("planner", planner_node)
    workflow.add_node("extractor", extractor_step_node)
    workflow.add_node("finalize_extractor", finalize_extractor_trace)
    workflow.add_node("qa", qa_node)
    workflow.set_entry_point("planner")
    workflow.add_conditional_edges(
        "planner",
        _after_planner,
        {"pause": END, "extractor": "extractor"},
    )
    workflow.add_conditional_edges(
        "extractor",
        _after_extractor,
        {"extractor": "extractor", "finalize_extractor": "finalize_extractor"},
    )
    workflow.add_edge("finalize_extractor", "qa")
    workflow.add_edge("qa", END)
    return workflow.compile()


pipeline_graph = None


def get_graph():
    global pipeline_graph
    if pipeline_graph is None:
        pipeline_graph = build_graph()
    return pipeline_graph
