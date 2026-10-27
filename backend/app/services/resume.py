from __future__ import annotations

from typing import Any

from app.agents.planner import recheck_edited_plan
from app.models.state import GraphState, PlanSteps, SubQuestion


def apply_resume(state: GraphState, body: dict[str, Any]) -> GraphState:
    state["awaiting_human_input"] = False
    if body.get("regenerate"):
        state["human_reviewed"] = False
        state["retried"] = False
        state["current_step_index"] = 0
        state["extractor_trace"] = {"subQueries": [], "evaluationPassed": False}
        state["retrieved_docs"] = []
        state["extractor_step_valid"] = []
        return state

    state["human_reviewed"] = True
    edited = body.get("editedSubQuestions")
    if edited:
        plan = state.get("plan")
        if isinstance(plan, dict):
            plan = PlanSteps.model_validate(plan)
        if not isinstance(plan, PlanSteps):
            raise ValueError("No plan to edit")
        old = [sq.question for sq in plan.sub_questions]
        new_subs: list[SubQuestion] = []
        for i, item in enumerate(edited, start=1):
            if isinstance(item, str):
                new_subs.append(
                    SubQuestion(step_id=i, question=item, depends_on=[], search_keywords=[])
                )
            else:
                depends = item.get("dependsOn") or item.get("depends_on") or []
                new_subs.append(
                    SubQuestion(
                        step_id=int(item.get("id") or item.get("step_id") or i),
                        question=str(item.get("text") or item.get("question") or ""),
                        depends_on=[int(d) for d in depends],
                        search_keywords=list(item.get("search_keywords") or []),
                    )
                )
        plan.sub_questions = new_subs
        state["plan"] = plan
        state["human_diff"] = {"before": old, "after": [s.question for s in new_subs]}
        return recheck_edited_plan(state)

    report = dict(state.get("verification_report") or {})
    report["flags"] = list(report.get("flags") or []) + ["human approved plan as-is"]
    report["overall_status"] = "PASS"
    state["verification_report"] = report
    # Same as the edit path: a human reviewed a failed plan, so it is MEDIUM at best.
    state["confidence_flag"] = "MEDIUM"
    return state
