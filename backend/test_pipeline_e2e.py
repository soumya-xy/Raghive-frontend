import asyncio
import sys
import traceback

sys.path.insert(0, r"d:\hack_\Raghive-frontend\backend")

from app.models.state import empty_state, PlanSteps, SubQuestion
from app.agents.extractor import extractor_step_node

def main():
    try:
        print("Testing single extractor step 0...", flush=True)
        state = empty_state("what is ACID property", strictness="standard")
        state["plan"] = PlanSteps(
            original_query="what is ACID property",
            sub_questions=[
                SubQuestion(step_id=1, question="what is ACID property in database", depends_on=[]),
            ],
            chain_of_thought="Explain ACID properties",
            initial_confidence=0.9,
        )
        state["current_step_index"] = 0
        state["extractor_trace"] = {"subQueries": []}
        state["extractor_step_valid"] = []
        state["retrieved_docs"] = []

        res = extractor_step_node(state)
        print("Extractor step 0 done successfully!", flush=True)
        print("Retrieved docs:", len(res.get("retrieved_docs", [])), flush=True)
        print("Extractor trace:", res.get("extractor_trace"), flush=True)

    except Exception as e:
        print("CRASHED:", flush=True)
        traceback.print_exc()

if __name__ == "__main__":
    main()
