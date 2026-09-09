import pandas as pd
import json


def time_to_seconds(value):
    """
    Converts HH:MM:SS values from Excel into integer seconds.
    """
    if pd.isna(value):
        return None

    # Excel time values
    if hasattr(value, "hour"):
        return value.hour * 3600 + value.minute * 60 + value.second

    # String values
    h, m, s = map(int, str(value).split(":"))
    return h * 3600 + m * 60 + s


# Read Excel file
df = pd.read_excel("data/data.xlsx")

members = {}

for _, row in df.iterrows():

    name = str(row["Name"]).strip()
    year = str(int(row["Jahr"]))

    # Create member entry if not existing
    if name not in members:
        members[name] = {
            "name": name,
            "years": {}
        }

    # Add year-specific data
    members[name]["years"][year] = {
        "health": {
            "bp_before": {
                "low": int(row["Blutdruck DIA Start"]),
                "high": int(row["Blutdruck SYS Start"])
            },
            "bp_after": {
                "low": int(row["Blutdruck DIA Ende"]),
                "high": int(row["Blutdruck SYS Ende"])
            },
            "pulsoxy": int(row["Oxi nach Treppe"]),
            "pulse": {
                "before": int(row["Puls Start"]),
                "load": int(row["Puls unter Belastung"]),
                "after": int(row["Puls Ende"])
            }
        },

        "time_tests": [
            time_to_seconds(row["Gehen mit/ohne Schläuche"]),
            time_to_seconds(row["Hindernisparcours"]),
            time_to_seconds(row["Gehen mit Kanistern"]),
            time_to_seconds(row["Treppensteigen"]),
            time_to_seconds(row["Schlauchrollen"])
        ],

        "air_consumption": int(row["Luftverbrauch"]),

        # Overall time in seconds
        "time_overall": time_to_seconds(row["Zeitdauer"])
    }

# Final JSON structure
result = {
    "members": list(members.values())
}

# Write JSON file
with open("data/results.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)