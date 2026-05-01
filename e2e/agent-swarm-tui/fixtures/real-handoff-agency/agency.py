from typing import Literal

from agency_swarm import Agency, Agent, Handoff, ModelSettings, function_tool


@function_tool
def lookup_note(topic: str) -> str:
    """Return a deterministic note for research delegation."""
    return f"Research note for {topic}: verified by ResearchAgent."


@function_tool
def calculate(a: float, b: float, operation: Literal["add", "subtract", "multiply", "divide"] = "add") -> str:
    """Perform basic arithmetic."""
    if operation == "add":
        value = a + b
    elif operation == "subtract":
        value = a - b
    elif operation == "multiply":
        value = a * b
    else:
        if b == 0:
            return "Error: Cannot divide by zero."
        value = a / b
    return f"Result: {value}"


def create_agency() -> Agency:
    support = Agent(
        name="UserSupportAgent",
        description="Receives user requests and chooses delegation or persistent handoff.",
        instructions=(
            "You are UserSupportAgent. Use SendMessage for research tasks that should return control to you. "
            "Use the transfer tool for math-heavy tasks that MathAgent should continue handling."
        ),
        model="gpt-5.4-mini",
        model_settings=ModelSettings(temperature=0.0),
    )

    research = Agent(
        name="ResearchAgent",
        description="Handles delegated research and returns the result.",
        instructions="You are ResearchAgent. Use lookup_note and return the result to UserSupportAgent.",
        tools=[lookup_note],
        model="gpt-5.4-mini",
        model_settings=ModelSettings(temperature=0.0),
    )

    math = Agent(
        name="MathAgent",
        description="Handles persistent math handoffs.",
        instructions="You are MathAgent. Use calculate and continue the user's math task after handoff.",
        tools=[calculate],
        model="gpt-5.4-mini",
        model_settings=ModelSettings(temperature=0.0),
    )

    return Agency(
        support,
        research,
        math,
        communication_flows=[
            (support, research),
            (support, math, Handoff),
        ],
        shared_instructions="Demonstrate SendMessage delegation and Handoff control transfer.",
        name="RealHandoffAgency",
    )


if __name__ == "__main__":
    create_agency().tui(show_reasoning=True)
