from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlite3
from typing import List

# Initialisation de l'application FastAPI
app = FastAPI()

database = "logement.db"

# Modèles Pydantic pour validation
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

# Connexion à la base de données
def get_db_connection():
    conn = sqlite3.connect(database)
    conn.row_factory = sqlite3.Row
    return conn

# Endpoint pour récupérer tous les logements
@app.get("/logements", response_model=List[Logement])
def get_logements():
    conn = get_db_connection()
    logements = conn.execute("SELECT * FROM Housing").fetchall()
    conn.close()
    return [dict(logement) for logement in logements]

# Endpoint pour ajouter un logement
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

# Endpoint pour supprimer un logement et ses données associées
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

# Endpoint pour modifier un logement
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

# Endpoint pour récupérer les factures
@app.get("/invoices", response_model=List[Invoice])
def get_invoices():
    conn = get_db_connection()
    invoices = conn.execute("SELECT * FROM Invoice").fetchall()
    conn.close()
    return [dict(invoice) for invoice in invoices]

# Endpoint pour ajouter une facture
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

# Endpoint pour supprimer une facture
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

# Endpoint pour modifier une facture
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

# Endpoint pour récupérer les pièces
@app.get("/rooms", response_model=List[Room])
def get_rooms():
    conn = get_db_connection()
    rooms = conn.execute("SELECT * FROM Room").fetchall()
    conn.close()
    return [dict(room) for room in rooms]

# Endpoint pour ajouter une pièce
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

# Endpoint pour supprimer une pièce
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

# Endpoint pour modifier une pièce
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

# Endpoint pour récupérer les capteurs
@app.get("/sensors", response_model=List[Sensor])
def get_sensors():
    conn = get_db_connection()
    sensors = conn.execute("SELECT * FROM Sensor").fetchall()
    conn.close()
    return [dict(sensor) for sensor in sensors]

# Endpoint pour ajouter un capteur
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

# Endpoint pour supprimer un capteur
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

# Endpoint pour modifier un capteur
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

# Endpoint pour ajouter une mesure
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

# Endpoint pour supprimer une mesure
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

# Endpoint pour modifier une mesure
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
