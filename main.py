from fastapi import FastAPI, HTTPException, Depends, Request, Form
from pydantic import BaseModel
import sqlite3
from typing import List, Optional, Annotated
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func
from datetime import datetime
from contextlib import asynccontextmanager
import httpx

# Initialisation de l'application FastAPI
app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

database = "logement.db"

from datetime import datetime

# Filtre pour formater la date
def date_format(value):
    try:
        date_obj = datetime.strptime(value, "%Y-%m-%d")
        return date_obj.strftime("%a %d/%m")  # Format "Lun 16/12"
    except:
        return value

templates.env.filters["date_format"] = date_format



# Connexion à la base de données
def get_db_connection():
    conn = sqlite3.connect(database)
    conn.row_factory = sqlite3.Row
    return conn

# Modèles Pydantic
class Logement(BaseModel):
    address: str
    phone_number: str
    ip_address: str

class Invoice(BaseModel):
    housing_id: int
    type: str
    amount: int
    value: int

class Room(BaseModel):
    housing_id: int
    name: str
    x: float
    y: float
    z: float

class Sensor(BaseModel):
    room_id: int
    type_id: int
    commercial_reference: str
    communication_port: str

class Measurement(BaseModel):
    sensor_id: int
    value: float
    date: Optional[datetime] = None

# Gestion des logements
@app.post("/logements")
def add_logement(logement: Logement):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Housing (address, phone_number, ip_address)
            VALUES (?, ?, ?)
            """,
            (logement.address, logement.phone_number, logement.ip_address)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()
    return {"message": "Logement ajouté avec succès."}

@app.get("/logements", response_model=List[Logement])
def get_logements():
    conn = get_db_connection()
    logements = conn.execute("SELECT * FROM Housing").fetchall()
    conn.close()
    return [dict(logement) for logement in logements]

@app.delete("/logements/{housing_id}")
def delete_logement(housing_id: int):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM Measurements WHERE sensor_id IN (SELECT sensor_id FROM Sensor WHERE room_id IN (SELECT room_id FROM Room WHERE housing_id = ?))", (housing_id,))
        conn.execute("DELETE FROM Sensor WHERE room_id IN (SELECT room_id FROM Room WHERE housing_id = ?)", (housing_id,))
        conn.execute("DELETE FROM Room WHERE housing_id = ?", (housing_id,))
        conn.execute("DELETE FROM Invoice WHERE housing_id = ?", (housing_id,))
        conn.execute("DELETE FROM Housing WHERE housing_id = ?", (housing_id,))
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la suppression: {e}")
    finally:
        conn.close()
    return {"message": "Logement et ses données associées supprimés avec succès."}

@app.put("/logements/{housing_id}")
def update_logement(housing_id: int, logement: Logement):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE Housing SET address = ?, phone_number = ?, ip_address = ?
            WHERE housing_id = ?
            """,
            (logement.address, logement.phone_number, logement.ip_address, housing_id)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()
    return {"message": "Logement mis à jour avec succès."}

# Gestion des factures
@app.get("/invoices", response_model=List[Invoice])
def get_invoices():
    conn = get_db_connection()
    invoices = conn.execute("SELECT * FROM Invoice").fetchall()
    conn.close()
    return [dict(invoice) for invoice in invoices]

@app.post("/invoices")
def add_invoice(invoice: Invoice):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Invoice (housing_id, type, amount, value)
            VALUES (?, ?, ?, ?)
            """,
            (invoice.housing_id, invoice.type, invoice.amount, invoice.value)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()
    return {"message": "Facture ajoutée avec succès."}

@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM Invoice WHERE invoice_id = ?", (invoice_id,))
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la suppression: {e}")
    finally:
        conn.close()
    return {"message": "Facture supprimée avec succès."}

@app.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, invoice: Invoice):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE Invoice SET housing_id = ?, type = ?, amount = ?, value = ?
            WHERE invoice_id = ?
            """,
            (invoice.housing_id, invoice.type, invoice.amount, invoice.value, invoice_id)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()
    return {"message": "Facture mise à jour avec succès."}

# Gestion des pièces
@app.get("/rooms", response_model=List[Room])
def get_rooms():
    conn = get_db_connection()
    rooms = conn.execute("SELECT * FROM Room").fetchall()
    conn.close()
    return [dict(room) for room in rooms]

@app.post("/rooms")
def add_room(room: Room):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Room (housing_id, name, x, y, z)
            VALUES (?, ?, ?, ?, ?)
            """,
            (room.housing_id, room.name, room.x, room.y, room.z)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()
    return {"message": "Pièce ajoutée avec succès."}

@app.delete("/rooms/{room_id}")
def delete_room(room_id: int):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM Room WHERE room_id = ?", (room_id,))
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la suppression: {e}")
    finally:
        conn.close()
    return {"message": "Pièce supprimée avec succès."}

@app.put("/rooms/{room_id}")
def update_room(room_id: int, room: Room):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE Room SET housing_id = ?, name = ?, x = ?, y = ?, z = ?
            WHERE room_id = ?
            """,
            (room.housing_id, room.name, room.x, room.y, room.z, room_id)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()
    return {"message": "Pièce mise à jour avec succès."}

# Gestion des capteurs
@app.get("/sensors", response_model=List[Sensor])
def get_sensors():
    conn = get_db_connection()
    sensors = conn.execute("SELECT * FROM Sensor").fetchall()
    conn.close()
    return [dict(sensor) for sensor in sensors]

@app.post("/sensors")
def add_sensor(sensor: Sensor):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Sensor (room_id, type_id, commercial_reference, communication_port)
            VALUES (?, ?, ?, ?)
            """,
            (sensor.room_id, sensor.type_id, sensor.commercial_reference, sensor.communication_port)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()
    return {"message": "Capteur ajouté avec succès."}

@app.delete("/sensors/{sensor_id}")
def delete_sensor(sensor_id: int):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM Sensor WHERE sensor_id = ?", (sensor_id,))
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la suppression: {e}")
    finally:
        conn.close()
    return {"message": "Capteur supprimé avec succès."}

@app.put("/sensors/{sensor_id}")
def update_sensor(sensor_id: int, sensor: Sensor):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE Sensor SET room_id = ?, type_id = ?, commercial_reference = ?, communication_port = ?
            WHERE sensor_id = ?
            """,
            (sensor.room_id, sensor.type_id, sensor.commercial_reference, sensor.communication_port, sensor_id)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()
    return {"message": "Capteur mis à jour avec succès."}

# Gestion des mesures
@app.post("/measurements")
def add_measurement(measurement: Measurement):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Measurements (sensor_id, value)
            VALUES (?, ?)
            """,
            (measurement.sensor_id, measurement.value)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()
    return {"message": "Mesure ajoutée avec succès."}

@app.delete("/measurements/{measurement_id}")
def delete_measurement(measurement_id: int):
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM Measurements WHERE measurement_id = ?", (measurement_id,))
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la suppression: {e}")
    finally:
        conn.close()
    return {"message": "Mesure supprimée avec succès."}

@app.put("/measurements/{measurement_id}")
def update_measurement(measurement_id: int, measurement: Measurement):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE Measurements SET sensor_id = ?, value = ?
            WHERE measurement_id = ?
            """,
            (measurement.sensor_id, measurement.value, measurement_id)
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()
    return {"message": "Mesure mise à jour avec succès."}


# Consommation et météo dynamiques
@app.get("/consommation", response_class=HTMLResponse)
async def consommation(request: Request):
    conn = get_db_connection()
    query = """
    SELECT type, SUM(amount) as total_amount FROM Invoice GROUP BY type
    """
    invoices = conn.execute(query).fetchall()
    conn.close()
    chart_data = [["Type", "Montant"]] + [[invoice["type"], invoice["total_amount"]] for invoice in invoices]
    return templates.TemplateResponse("consommation.html", {"request": request, "chart_data": chart_data})

@app.get("/meteo", response_class=HTMLResponse)
async def meteo(request: Request):
    base_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 48.8566,  # Paris
        "longitude": 2.3522,
        "daily": "temperature_2m_max,temperature_2m_min,weathercode",
        "hourly": "temperature_2m,precipitation_probability",
        "timezone": "Europe/Paris",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(base_url, params=params)
        data = response.json()

    # Mapping codes météo vers les GIFs
    weather_code_map = {
        0: "soleil.gif", 1: "soleil.gif", 2: "nuage.gif", 3: "nuage.gif",
        45: "brouillard.gif", 48: "brouillard.gif",
        51: "pluie.gif", 53: "pluie.gif", 55: "pluie.gif",
        61: "pluie.gif", 63: "forte_pluie.gif", 65: "forte_pluie.gif",
        80: "pluie.gif", 95: "orage.gif", 96: "neige.gif", 99: "neige.gif"
    }

    # Construction de la réponse
    forecast = {
        "dates": data["daily"]["time"],
        "max_temp": data["daily"]["temperature_2m_max"],
        "min_temp": data["daily"]["temperature_2m_min"],
        "icons": [weather_code_map.get(code, "inconnu.gif") for code in data["daily"]["weathercode"]],
        "hourly": {
            "times": data["hourly"]["time"],
            "temperatures": data["hourly"]["temperature_2m"],
            "precipitations": data["hourly"]["precipitation_probability"]
        }
    }
    return templates.TemplateResponse("meteo.html", {"request": request, "forecast": forecast})



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
