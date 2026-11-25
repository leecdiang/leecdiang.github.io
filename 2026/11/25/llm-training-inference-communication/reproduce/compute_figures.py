#!/usr/bin/env python3
"""Rebuild the collective layout, ring cost and TP size SVGs plus plot data."""
import argparse
import csv
from math import log10, log2
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).resolve().parent
VISUALS = HERE.parents[2] / "_visuals" / "llm-communication"
KIB = 2**10
MIB = 2**20
BLUE = "var(--chart-blue)"
TEAL = "var(--chart-teal)"
AMBER = "var(--chart-amber)"
DIVIDER = "var(--line)"
PAPER = "var(--figure-surface)"
P = 8
ALPHA_US = 2
B_BYTES_PER_SECOND = 50e9
LAYERS = 32
HIDDEN = 4096
BYTES_PER_ELEMENT = 2
KV_BYTES_PER_TOKEN = 2 * 32 * 8 * 128 * BYTES_PER_ELEMENT


def write_csv(filename, fields, rows):
    with (HERE / filename).open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(fields)
        writer.writerows(rows)


def svg(width, height, label, description, body):
    config = 'font-family="system-ui, sans-serif" font-size="17"'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'role="img" aria-label="{escape(label)}" {config}>\n'
        f"<desc>{escape(description)}</desc>\n"
        + "\n".join(body)
        + "\n</svg>\n"
    )


def label(x, y, value, *, anchor="start", size=17, css="v-ink", weight=400):
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" class="{css}" font-size="{size}" '
        f'text-anchor="{anchor}" font-weight="{weight}">{escape(str(value))}</text>'
    )


def line(x1, y1, x2, y2, *, stroke=DIVIDER, width=1, dash=""):
    dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
    return (
        f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" '
        f'stroke="{stroke}" stroke-width="{width}"{dash_attr}/>'
    )


def rect(x, y, width, height, *, fill=PAPER, stroke=DIVIDER, radius=5,
         opacity=1):
    return (
        f'<rect x="{x}" y="{y}" width="{width}" height="{height}" rx="{radius}" '
        f'fill="{fill}" fill-opacity="{opacity}" stroke="{stroke}"/>'
    )


def dot(x, y, *, color, radius=6):
    return (
        f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{radius}" '
        f'fill="{color}"/>'
    )


def collective_layout():
    matrix = [list(range(start, start + 4)) for start in (1, 5, 9, 13)]
    transpose = list(zip(*matrix))
    reduced = tuple(map(sum, transpose))
    heads = tuple(row[0] for row in matrix)
    assert reduced == (28, 32, 36, 40) and transpose[2] == (3, 7, 11, 15)
    panels = (
        ("A   AllGather", "Rank-ordered copies", [(v,) for v in heads], [heads] * 4, BLUE),
        ("B   ReduceScatter", "Column sums, one per rank", matrix, [(v,) for v in reduced], TEAL),
        ("C   All-to-All", "Each column goes to its destination", matrix, transpose, AMBER),
        ("D   AllReduce", "Column sums on every rank", matrix, [reduced] * 4, TEAL),
    )
    body = []
    for index, (name, summary, inputs, outputs, color) in enumerate(panels):
        x = 15 + (index % 2) * 389
        y = 15 + (index // 2) * 244
        body.extend((
            rect(x, y, 373, 229, radius=9),
            label(x + 15, y + 30, name, size=21, weight=650),
            label(x + 15, y + 55, summary, size=16, css="v-sub"),
            label(x + 64, y + 90, "Input", size=15, css="v-sub"),
            label(x + 225, y + 90, "Output", size=15, css="v-sub"),
            line(x + 196, y + 98, x + 196, y + 215),
        ))
        for rank in range(4):
            row_y = y + 102 + rank * 29
            body.append(label(x + 15, row_y + 18, f"r{rank}", size=15, css="v-sub"))
            for values, start, emphasis in (
                (inputs[rank], x + 62, False), (outputs[rank], x + 224, True)
            ):
                for j, value in enumerate(values):
                    cell_x = start + 32 * j
                    body.extend((
                        rect(cell_x, row_y, 28, 24,
                             fill=color if emphasis else PAPER,
                             stroke=DIVIDER, opacity=.14 if emphasis else 1),
                        label(cell_x + 14, row_y + 17, value, anchor="middle",
                              size=15, weight=610 if emphasis else 400),
                    ))
    return svg(
        792, 503, "Four collective operations on four ranks",
        "AllGather copies the rank-ordered first elements 1, 5, 9 and 13. "
        "ReduceScatter assigns the column sums 28, 32, 36 and 40. All-to-All "
        "sends each input column to its destination. AllReduce replicates the column sums.",
        body,
    )


def ring_cost(size_bytes):
    startup_us = 2 * (P - 1) * ALPHA_US
    wire_us = 2 * (P - 1) / P * (size_bytes / B_BYTES_PER_SECOND) * 1e6
    return startup_us, wire_us, startup_us + wire_us


def ring_chart():
    crossover_bytes = int(P * ALPHA_US * 1e-6 * B_BYTES_PER_SECOND)
    assert crossover_bytes == 800000
    assert ring_cost(crossover_bytes) == (28, 28, 56)
    sizes = [2 ** exponent for exponent in range(13, 29)]
    x_left, x_right, y_top, y_bottom = 98, 736, 102, 376

    def x(size):
        return x_left + (log2(size) - 13) / 15 * (x_right - x_left)

    def y(us):
        return y_bottom - (log10(us) + 1) / 5 * (y_bottom - y_top)

    body = [
        label(22, 29, "Ring AllReduce latency", size=23, weight=650),
        label(22, 54, "8 ranks  /  2 µs per round  /  50 GB/s one-way", size=16, css="v-sub"),
        label(x_left, 91, "Time (µs)", size=15, css="v-sub"),
    ]
    for value, text in ((.1, "0.1"), (1, "1"), (10, "10"), (100, "100"),
                        (1000, "1,000"), (10000, "10,000")):
        body.extend((
            line(x_left, y(value), x_right, y(value)),
            label(x_left - 10, y(value) + 5, text, anchor="end", size=15, css="v-sub"),
        ))
    for size, text in zip(sizes[::3], ("8 KiB", "64 KiB", "512 KiB", "4 MiB", "32 MiB", "256 MiB")):
        body.extend((
            line(x(size), y_top, x(size), y_bottom),
            label(x(size), y_bottom + 23, text, anchor="middle", size=15, css="v-sub"),
        ))
    body.extend((
        line(x_left, y_bottom, x_right, y_bottom, stroke="var(--muted)"),
        line(x_left, y_top, x_left, y_bottom, stroke="var(--muted)"),
        label((x_left + x_right) / 2, 428, "Input per rank (log scale)",
              anchor="middle", size=16, css="v-sub"),
    ))
    for idx, (legend_text, color, dash, legend_x) in enumerate((
        ("Startup", TEAL, "7 5", 350), ("Transfer", AMBER, "2 5", 476), ("Total", BLUE, "", 610)
    )):
        value_points = " ".join(
            f"{x(2**(13 + i / 4)):.2f},{y(ring_cost(2**(13 + i / 4))[idx]):.2f}"
            for i in range(61)
        )
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        body.extend((
            f'<polyline points="{value_points}" fill="none" stroke="{color}" '
            f'stroke-width="3" stroke-linecap="round"{dash_attr}/>',
            line(legend_x, 72, legend_x + 32, 72, stroke=color, width=3, dash=dash),
            label(legend_x + 40, 77, legend_text, size=15),
        ))
    cross_x, cross_y = x(crossover_bytes), y(28)
    body.extend((
        line(cross_x, cross_y + 8, cross_x, 280, stroke="var(--muted)", dash="3 4"),
        dot(cross_x, cross_y, radius=4, color="var(--ink)"),
        label(cross_x + 10, 280, "800 kB · both 28 µs", size=15, css="v-sub"),
    ))
    return svg(
        792, 450, "Modeled latency of ring AllReduce with eight ranks",
        "Two logarithmic axes. The constant startup cost and the rising transfer cost "
        "cross at 800 kilobytes, where each contributes 28 microseconds. The total is their sum.",
        body,
    )


def tp_payload(token_rows):
    return token_rows * HIDDEN * BYTES_PER_ELEMENT


def tp_chart():
    decode, prefill = tp_payload(16), tp_payload(2048)
    assert (decode, prefill) == (128 * KIB, 16 * MIB)
    x_left, x_right, y_top, y_bottom = 233, 733, 98, 252

    def x(size):
        return x_left + (log2(size) - 15) / 10 * (x_right - x_left)

    body = [
        label(22, 31, "TP collective size per forward call", size=23, weight=650),
        label(22, 56, "32 layers  /  hidden size 4,096  /  BF16 activations", size=16, css="v-sub"),
    ]
    for size, text in (
        (32*KIB, "32 KiB"), (128*KIB, "128 KiB"), (512*KIB, "512 KiB"),
        (2*MIB, "2 MiB"), (8*MIB, "8 MiB"), (32*MIB, "32 MiB")
    ):
        body.extend((
            line(x(size), y_top, x(size), y_bottom),
            label(x(size), y_bottom + 24, text, anchor="middle", size=15, css="v-sub"),
        ))
    for title, subtitle, size, y0, color, value in (
        ("Prefill", "2,048 token rows", prefill, 139, BLUE, "16 MiB"),
        ("Decode", "16 token rows", decode, 209, TEAL, "128 KiB"),
    ):
        body.extend((
            label(23, y0 - 11, title, size=20, weight=650),
            label(23, y0 + 12, subtitle, size=16, css="v-sub"),
            line(x_left, y0, x(size), y0, stroke=color, width=3),
            dot(x(size), y0, radius=7, color=color),
            label(x(size) + 12, y0 - 12, value, size=17, weight=650),
            label(x(size) - 12, y0 + 19, "64 AllReduce calls", anchor="end", size=15, css="v-sub"),
        ))
    body.extend((
        line(x_left, y_bottom, x_right, y_bottom, stroke="var(--muted)"),
        label((x_left+x_right) / 2, 309, "One AllReduce input per rank (log scale)",
              anchor="middle", size=16, css="v-sub"),
    ))
    return svg(
        792, 331, "Tensor-parallel AllReduce sizes in prefill and decode",
        "With 32 layers, both forwards call 64 layer collectives. One prefill collective "
        "takes 16 MiB per rank for 2048 rows. One decode collective takes 128 KiB for 16 rows.",
        body,
    )


def kv_serialization_ms(token_rows, rate_gbps):
    return KV_BYTES_PER_TOKEN * token_rows * 8 / (rate_gbps * 1e9) * 1e3


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--visuals", type=Path, default=VISUALS)
    args = parser.parse_args()
    args.visuals.mkdir(parents=True, exist_ok=True)
    for name, figure in (
        ("01-collective-layouts", collective_layout),
        ("02-ring-cost", ring_chart),
        ("06-tp-inference", tp_chart),
    ):
        (args.visuals / f"{name}.svg").write_text(figure(), encoding="utf-8")
    write_csv("ring-cost.csv", ("input_bytes_per_rank", "startup_us", "transfer_us", "total_us"),
              ((size, *ring_cost(size)) for size in [*(2**e for e in range(13, 29)), 800000]))
    write_csv("tp-inference.csv", ("forward", "token_rows", "input_bytes_per_rank", "layer_allreduces"),
              ((name, n, tp_payload(n), 2 * LAYERS) for name, n in (("prefill", 2048), ("decode", 16))))
    write_csv("kv-transfer.csv", ("prompt_tokens", "logical_kv_bytes", "rate_gbps", "serialization_ms"),
              ((n, n * KV_BYTES_PER_TOKEN, rate, f"{kv_serialization_ms(n, rate):.9f}")
               for n in range(0, 32769, 2048) for rate in (100, 200, 400)))


if __name__ == "__main__":
    main()
