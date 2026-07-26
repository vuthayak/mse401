"""Natural-language renderings of catalog rows and shopper feedback.

The same descriptive vocabulary feeds the embeddings, the LLM prompt, and the
heuristic fallback, so a garment reads the same way at every stage.
"""

from __future__ import annotations

from typing import Any

ATTRIBUTE_LABELS = {
    "fabric": "fabric",
    "fit": "fit",
    "colour": "colour",
    "price": "price",
}

# The fit axis is bipolar: 1 is "too loose" and 5 is "too tight", so both ends
# signal dissatisfaction while the other three axes only fail downward.
FIT_LABELS = {
    1: "much too loose",
    2: "slightly too loose",
    3: "just right",
    4: "slightly too tight",
    5: "much too tight",
}

FABRIC_LABELS = {
    1: "hated the fabric",
    2: "disliked the fabric",
    3: "was neutral on the fabric",
    4: "liked the fabric",
    5: "loved the fabric",
}

COLOUR_LABELS = {
    1: "hated the colour",
    2: "disliked the colour",
    3: "was neutral on the colour",
    4: "liked the colour",
    5: "loved the colour",
}

PRICE_LABELS = {
    1: "found it overpriced",
    2: "found it poor value",
    3: "found the price fair",
    4: "found it good value",
    5: "found it great value",
}


def variation_embedding_text(row: dict[str, Any]) -> str:
    """The document text stored alongside each embedding."""
    return (
        f"{row['title']} by {row['brand']}. "
        f"{row['apparel_type']} / {row['design_type']}. "
        f"Colour: {row['color_label']} ({row['color_family']}). "
        f"Material: {row['material_label']}, {row['material_family']}, "
        f"{row['hand_feel']}. "
        f"Fit: {row['fit_profile']}. "
        f"Size {row['size']}. "
        f"Price: ${float(row['unit_price']):.2f}. "
        f"{row['description']}"
    )


def describe_current_item(row: dict[str, Any]) -> str:
    return (
        f"{row['title']} by {row['brand']} "
        f"(size {row['size']}, {row['color_label']}, {row['material_label']}, "
        f"${float(row['unit_price']):.2f})"
    )


def describe_feedback(vector: dict[str, int]) -> str:
    return "; ".join(
        [
            f"fabric {vector['fabric']}/5 ({FABRIC_LABELS[vector['fabric']]})",
            f"fit {vector['fit']}/5 ({FIT_LABELS[vector['fit']]})",
            f"colour {vector['colour']}/5 ({COLOUR_LABELS[vector['colour']]})",
            f"price {vector['price']}/5 ({PRICE_LABELS[vector['price']]})",
        ]
    )


def build_desire_text(current: dict[str, Any], vector: dict[str, int]) -> str:
    """The query document embedded for the pgvector similarity search.

    Starts from the garment in the room and rewrites the dimensions the shopper
    rejected, so the search vector points at what they want rather than at what
    they just took off.
    """
    wants: list[str] = [
        f"An alternative to a {current['color_label']} {current['title']} "
        f"({current['apparel_type']}, {current['material_label']}, "
        f"{current['fit_profile']} fit, ${float(current['unit_price']):.2f})."
    ]

    if vector["fabric"] <= 2:
        wants.append(
            f"Must NOT be {current['material_label']} or feel "
            f"{current['hand_feel']}. Prefer a different material family with a "
            "more comfortable hand-feel."
        )
    elif vector["fabric"] >= 4:
        wants.append(
            f"Keep a fabric like {current['material_label']} ({current['hand_feel']})."
        )

    if vector["fit"] <= 2:
        wants.append("The previous garment was too loose; prefer a closer cut or a smaller size.")
    elif vector["fit"] >= 4:
        wants.append("The previous garment was too tight; prefer a roomier cut or a larger size.")
    else:
        wants.append(f"Keep a {current['fit_profile']} fit.")

    if vector["colour"] <= 2:
        wants.append(
            f"Must NOT be {current['color_label']} or in the "
            f"{current['color_family']} family. Prefer a clearly different colour."
        )
    elif vector["colour"] >= 4:
        wants.append(f"Keep a colour close to {current['color_label']}.")

    if vector["price"] <= 2:
        ceiling = float(current["unit_price"]) * 0.75
        wants.append(f"Must cost less than ${ceiling:.2f}; the shopper wants better value.")
    elif vector["price"] >= 4:
        wants.append(f"A similar price to ${float(current['unit_price']):.2f} is acceptable.")

    return " ".join(wants)


def unhappy_attributes(vector: dict[str, int]) -> list[str]:
    """Dimensions that tripped the negative-variance trigger."""
    unhappy: list[str] = []
    if vector["fabric"] <= 2:
        unhappy.append("fabric")
    if vector["fit"] <= 2 or vector["fit"] >= 4:
        unhappy.append("fit")
    if vector["colour"] <= 2:
        unhappy.append("colour")
    if vector["price"] <= 2:
        unhappy.append("price")
    return unhappy
