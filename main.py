import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, Form
from pydantic import BaseModel
import sqlite3
from typing import List, Optional, Annotated
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse  # Added RedirectResponse import
from fastapi import UploadFile
import os
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.templating import Jinja2Templates
from sqlalchemy import func
from datetime import datetime, date
from contextlib import asynccontextmanager
import httpx
import logging
from fastapi.responses import JSONResponse


# Initialisation de l'application FastAPI
app = FastAPI()

# Define the upload folder
UPLOAD_FOLDER = "static/models"



app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

app.mount("/node_modules", StaticFiles(directory="node_modules"), name="node_modules")

app.mount("/vr", StaticFiles(directory="dist"), name="frontend")

# Rediriger /virtual_environment vers /vr/index.html
@app.get("/vite_scene", response_class=HTMLResponse)
def virtual_environment(request: Request):
    return RedirectResponse(url="/vr/index.html")



database = "logement.db"

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
    insert_date: date


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
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None
    z_coordinate: Optional[float] = None

class Measurement(BaseModel):
    sensor_id: int
    value: float
    date: Optional[datetime] = None

@app.get("/logements", response_class=HTMLResponse)
def get_logements(request: Request):
    conn = get_db_connection()
    logements = conn.execute("SELECT * FROM Housing").fetchall()
    conn.close()
    logements_list = [dict(row) for row in logements]

    # Rendu de la page HTML avec les logements existants
    return templates.TemplateResponse("logements.html", {
        "request": request,
        "logements": logements_list
    }) 


@app.post("/logements", response_class=HTMLResponse)
def add_logement(
    request: Request,
    address: str = Form(...),
    phone_number: str = Form(...),
    ip_address: str = Form(...),
    room_count: int = Form(...)
):
    conn = get_db_connection()
    try:
        # Insérer le logement
        cursor = conn.execute(
            """
            INSERT INTO Housing (address, phone_number, ip_address)
            VALUES (?, ?, ?)
            """,
            (address, phone_number, ip_address)
        )
        housing_id = cursor.lastrowid  # Récupérer l'ID du logement inséré

        # Ajouter les pièces associées
        for i in range(1, room_count + 1):
            room_name = f"Pièce {i}"
            conn.execute(
                """
                INSERT INTO Room (housing_id, name, x, y, z)
                VALUES (?, ?, 0, 0, 0)
                """,
                (housing_id, room_name)
            )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()

    # Après l'insertion, on recharge la même page
    return get_logements(request)

@app.put("/logements/{logement_id}")
def update_logement(logement_id: int, logement: Logement):
    conn = get_db_connection()
    try:
        result = conn.execute(
            """
            UPDATE Housing
            SET address = ?, phone_number = ?, ip_address = ?
            WHERE housing_id = ?
            """,
            (logement.address, logement.phone_number, logement.ip_address, logement_id)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Logement non trouvé.")
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour du logement : {e}")
    finally:
        conn.close()

    return {"message": "Logement mis à jour avec succès"}




@app.delete("/logements/{housing_id}")
def delete_logement(housing_id: int):
    print(f"Tentative de suppression du logement ID: {housing_id}")  # Débug
    conn = get_db_connection()
    try:
        result = conn.execute("DELETE FROM Housing WHERE housing_id = ?", (housing_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Logement non trouvé.")
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la suppression: {e}")
    finally:
        conn.close()
    return {"message": "Logement supprimé avec succès"}






@app.get("/visualiser_factures", response_class=HTMLResponse)
def visualiser_factures(request: Request, id: int = 1):
    conn = get_db_connection()
    logements = conn.execute("SELECT housing_id, address FROM Housing").fetchall()
    selected_logement = conn.execute("SELECT address FROM Housing WHERE housing_id = ?", (id,)).fetchone()
    
    # Mise à jour ici : Sélectionne insert_date
    factures = conn.execute("SELECT invoice_id, housing_id, type, amount, value, insert_date FROM Invoice WHERE housing_id = ?", (id,)).fetchall()
    
    conn.close()

    return templates.TemplateResponse("visualiser_factures.html", {
        "request": request,
        "logements": logements,
        "factures": factures,
        "selected_id": id,
        "selected_logement_address": selected_logement["address"] if selected_logement else "Logement par Défaut"
    })


@app.post("/factures")
def ajouter_facture(invoice: Invoice):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Invoice (housing_id, type, amount, value, insert_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (invoice.housing_id, invoice.type, invoice.amount, invoice.value, invoice.insert_date)
        )
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur SQL : {e}")
    finally:
        conn.close()
    return {"message": "Facture ajoutée avec succès"}

@app.put("/factures/{invoice_id}")
def modifier_facture(invoice_id: int, invoice: Invoice):
    conn = get_db_connection()
    try:
        result = conn.execute(
            """
            UPDATE Invoice 
            SET housing_id = ?, type = ?, amount = ?, value = ?, insert_date = ?
            WHERE invoice_id = ?
            """,
            (invoice.housing_id, invoice.type, invoice.amount, invoice.value, invoice.insert_date, invoice_id)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Facture non trouvée.")
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur SQL : {e}")
    finally:
        conn.close()
    return JSONResponse(content={"message": "Facture mise à jour avec succès"})




@app.delete("/factures/{invoice_id}", response_class=HTMLResponse)
def supprimer_facture(request: Request, invoice_id: int):
    conn = get_db_connection()
    try:
        result = conn.execute("DELETE FROM Invoice WHERE invoice_id = ?", (invoice_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Facture non trouvée.")
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la suppression de la facture : {e}")
    finally:
        conn.close()
    return templates.TemplateResponse("message.html", {"request": request, "message": "Facture supprimée avec succès"})


@app.get("/floormap/{housing_id}", response_class=HTMLResponse)
def get_floormap_for_housing(request: Request, housing_id: int):
    conn = get_db_connection()
    logements = conn.execute("SELECT housing_id, address FROM Housing").fetchall()
    rooms = conn.execute("SELECT * FROM Room WHERE housing_id = ?", (housing_id,)).fetchall()
    logement_address = next((logement["address"] for logement in logements if logement["housing_id"] == housing_id), "Logement par Défaut")
    conn.close()

    logements_list = [dict(logement) for logement in logements]
    rooms_list = [dict(room) for room in rooms]

    return templates.TemplateResponse("floormap.html", {
        "request": request,
        "logements": logements_list,
        "rooms": rooms_list,
        "selected_id": housing_id,
        "selected_logement_address": logement_address
    })



@app.get("/rooms/{housing_id}", response_class=HTMLResponse)
def get_rooms_for_housing(request: Request, housing_id: int):
    conn = get_db_connection()
    logements = conn.execute("SELECT housing_id, address FROM Housing").fetchall()
    rooms = conn.execute("SELECT * FROM Room WHERE housing_id = ?", (housing_id,)).fetchall()
    logement_address = next((logement["address"] for logement in logements if logement["housing_id"] == housing_id), "Logement par Défaut")
    conn.close()

    # Convert rows to dictionaries to avoid serialization errors
    logements_list = [dict(logement) for logement in logements]
    rooms_list = [dict(room) for room in rooms]

    return templates.TemplateResponse("rooms.html", {
        "request": request,
        "logements": logements_list,
        "rooms": rooms_list,
        "selected_id": housing_id,
        "selected_logement_address": logement_address
    })



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
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()
    return {"message": "Pièce ajoutée avec succès."}




@app.put("/rooms/{room_id}")
async def update_room(
    room_id: int,
    x: Optional[float] = Form(None),
    y: Optional[float] = Form(None),
    z: Optional[float] = Form(None),
    name: Optional[str] = Form(None),
    gltf_model: Optional[UploadFile] = None,
    delete_gltf: Optional[bool] = Form(False),
):
    conn = get_db_connection()
    try:
        # Delete existing GLTF model
        if delete_gltf:
            conn.execute(
                "UPDATE Room SET gltf_model = NULL WHERE room_id = ?",
                (room_id,),
            )
            conn.commit()
            return {"message": "GLTF model removed successfully."}

        # Upload new GLTF model
        if gltf_model:
            os.makedirs("static/models", exist_ok=True)
            file_path = f"static/models/{gltf_model.filename}"
            with open(file_path, "wb") as buffer:
                buffer.write(await gltf_model.read())
            
            conn.execute(
                "UPDATE Room SET gltf_model = ? WHERE room_id = ?",
                (file_path, room_id),
            )

        # Update coordinates and name
        conn.execute(
            """
            UPDATE Room
            SET x = COALESCE(?, x),
                y = COALESCE(?, y),
                z = COALESCE(?, z),
                name = COALESCE(?, name)
            WHERE room_id = ?
            """,
            (x, y, z, name, room_id),
        )

        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()

    return {"message": "Pièce mise à jour avec succès."}


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


@app.get("/sensors/{housing_id}", response_class=HTMLResponse)
def get_sensors_by_housing(request: Request, housing_id: int):
    conn = get_db_connection()
    logements = conn.execute("SELECT housing_id, address FROM Housing").fetchall()
    sensors_by_room = conn.execute(
        """
        SELECT r.name AS room_name, s.sensor_id, s.type_id, s.commercial_reference, s.communication_port, 
               s.x_coordinate, s.y_coordinate, s.z_coordinate, r.room_id
        FROM Sensor s
        JOIN Room r ON s.room_id = r.room_id
        WHERE r.housing_id = ?
        ORDER BY r.room_id
        """, (housing_id,)
    ).fetchall()
    rooms = conn.execute("SELECT room_id, name FROM Room WHERE housing_id = ?", (housing_id,)).fetchall()
    conn.close()

    selected_logement_address = next(
        (logement["address"] for logement in logements if logement["housing_id"] == housing_id), None
    )

    return templates.TemplateResponse(
        "configuration.html",
        {
            "request": request,
            "logements": logements,
            "sensors_by_room": sensors_by_room,
            "rooms": rooms,
            "selected_id": housing_id,
            "selected_logement_address": selected_logement_address,
        },
    )

@app.post("/sensors")
def add_sensor(sensor: Sensor):
    print(f"Reçu : {sensor}")  # DEBUG : Voir les données reçues
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Sensor (room_id, type_id, commercial_reference, communication_port, x_coordinate, y_coordinate, z_coordinate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (sensor.room_id, sensor.type_id, sensor.commercial_reference, sensor.communication_port, 
             sensor.x_coordinate, sensor.y_coordinate, sensor.z_coordinate),
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion : {e}")
    finally:
        conn.close()
    return {"message": "Capteur ajouté avec succès."}

@app.put("/sensors/{sensor_id}")
def update_sensor(sensor_id: int, sensor: Sensor):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE Sensor 
            SET room_id = ?, type_id = ?, commercial_reference = ?, communication_port = ?, 
                x_coordinate = ?, y_coordinate = ?, z_coordinate = ?
            WHERE sensor_id = ?
            """,
            (sensor.room_id, sensor.type_id, sensor.commercial_reference, sensor.communication_port, 
             sensor.x_coordinate, sensor.y_coordinate, sensor.z_coordinate, sensor_id),
        )
        conn.commit()
    except sqlite3.Error as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {e}")
    finally:
        conn.close()
    return {"message": "Capteur mis à jour avec succès."}



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

@app.get("/consommation_par_logement", response_class=HTMLResponse)
def consommation_par_logement(request: Request, logement_id: int = None):
    conn = get_db_connection()
    logements = conn.execute("SELECT housing_id, address FROM Housing").fetchall()

    if logement_id is None:
        logement_id = 1  # Sélection par défaut du logement 1

    selected_logement = conn.execute(
        "SELECT address FROM Housing WHERE housing_id = ?", (logement_id,)
    ).fetchone()

    factures = conn.execute(
        "SELECT type, SUM(amount) as total_amount, SUM(value) as total_value "
        "FROM Invoice WHERE housing_id = ? GROUP BY type", (logement_id,)
    ).fetchall()

    chart_data = {
        "amount": [["Type", "Montant"]] + [[row["type"], row["total_amount"]] for row in factures],
        "value": [["Type", "Valeur"]] + [[row["type"], row["total_value"]] for row in factures],
    }

    message = "Aucune facture assignée à ce logement." if not factures else ""
    conn.close()

    return templates.TemplateResponse("consommation_par_logement.html", {
        "request": request,
        "logements": logements,
        "selected_id": logement_id,
        "selected_logement_address": selected_logement["address"] if selected_logement else "Logement par Défaut",
        "chart_data": chart_data,
        "message": message
    })



@app.get("/measurements/{sensor_id}", response_class=HTMLResponse)
def get_sensor_measurements(request: Request, sensor_id: int):
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row  # Ensure rows are returned as dictionaries
    
    logements = conn.execute("SELECT housing_id, address FROM Housing").fetchall()
    measurements = conn.execute(
        "SELECT value, insert_date FROM Measurements WHERE sensor_id = ? ORDER BY insert_date DESC",
        (sensor_id,)
    ).fetchall()

    sensor_info = conn.execute(
        """
        SELECT h.housing_id, h.address
        FROM Sensor s
        JOIN Room r ON s.room_id = r.room_id
        JOIN Housing h ON r.housing_id = h.housing_id
        WHERE s.sensor_id = ?
        """,
        (sensor_id,)
    ).fetchone()
    
    conn.close()

    # Convert sqlite3.Row to dict
    measurements = [dict(m) for m in measurements]

    return templates.TemplateResponse("measurements.html", {
        "request": request,
        "sensor_id": sensor_id,
        "measurements": measurements,
        "housing_id": sensor_info["housing_id"] if sensor_info else 1,
        "selected_logement_address": sensor_info["address"] if sensor_info else "Logement par Défaut"
    })

@app.post("/mesure/")
def add_measurement(measurement: Measurement):
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO Measurements (sensor_id, value, insert_date)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            """,
            (measurement.sensor_id, measurement.value)
        )
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'insertion: {e}")
    finally:
        conn.close()
    return {"message": "Mesure ajoutée avec succès"}




@app.get("/economies_realisees", response_class=HTMLResponse)
def economies_realisees(request: Request, logement_id: int = None):
    conn = get_db_connection()
    logements = conn.execute("SELECT housing_id, address FROM Housing").fetchall()

    if logement_id is None:
        logement_id = 1  # Sélection par défaut

    selected_logement = conn.execute(
        "SELECT address FROM Housing WHERE housing_id = ?", (logement_id,)
    ).fetchone()

    factures = conn.execute(
        """
        SELECT type, SUM(amount) AS total_amount, SUM(value) AS total_value
        FROM Invoice
        WHERE housing_id = ?
        GROUP BY type
        """,
        (logement_id,)
    ).fetchall()

    economies_data = {
        "categories": [row["type"] for row in factures],
        "amounts": [row["total_amount"] for row in factures],
        "values": [row["total_value"] for row in factures]
    }

    conn.close()

    return templates.TemplateResponse("economies_realisees.html", {
        "request": request,
        "logements": logements,
        "selected_id": logement_id,
        "selected_logement_address": selected_logement["address"] if selected_logement else "Logement par Défaut",
        "economies_data": economies_data
    })



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
        "icons": [weather_code_map.get(code, "nuage.gif") for code in data["daily"]["weathercode"]],
        "hourly": {
            "times": data["hourly"]["time"],
            "temperatures": data["hourly"]["temperature_2m"],
            "precipitations": data["hourly"]["precipitation_probability"]
        }
    }
    return templates.TemplateResponse("meteo.html", {"request": request, "forecast": forecast})


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    # Fetch météo data for the homepage
    base_url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": 48.8566,  # Paris
        "longitude": 2.3522,
        "daily": "temperature_2m_max,temperature_2m_min,weathercode",
        "hourly": "temperature_2m",
        "timezone": "Europe/Paris",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(base_url, params=params)
        data = response.json()

    if "daily" in data and "hourly" in data:
        forecast = {
            "dates": data["daily"]["time"],
            "max_temp": data["daily"]["temperature_2m_max"],
            "min_temp": data["daily"]["temperature_2m_min"],
            "hourly": {
                "times": data["hourly"]["time"],
                "temperatures": data["hourly"]["temperature_2m"],
            }
        }
    else:
        forecast = {}

    return templates.TemplateResponse("accueil.html", {
        "request": request,
        "forecast": forecast  # Ensure forecast is passed
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
        ,
        ssl_keyfile="localhost-key.pem",
        ssl_certfile="localhost.pem"
    )
