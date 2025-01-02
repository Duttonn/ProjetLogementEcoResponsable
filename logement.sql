-- Supprimer toutes les tables existantes pour éviter les conflits
DROP TABLE IF EXISTS Measurements;
DROP TABLE IF EXISTS Sensor;
DROP TABLE IF EXISTS SensorType;
DROP TABLE IF EXISTS Room;
DROP TABLE IF EXISTS Invoice;
DROP TABLE IF EXISTS Housing;


-- Créer la table Housing pour stocker les informations sur les logements
CREATE TABLE Housing (
housing_id INTEGER PRIMARY KEY, -- Identifiant unique pour chaque logement
address VARCHAR(255), -- Adresse du logement
phone_number VARCHAR(20), -- Numéro de contact pour le logement
ip_address VARCHAR(15), -- Adresse IP associée au logement
insert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Horodatage de l'ajout de l'enregistrement
);

-- Créer la table Invoice pour stocker les informations de facturation
CREATE TABLE Invoice (
invoice_id INTEGER PRIMARY KEY, -- Identifiant unique pour chaque facture
housing_id INTEGER, -- Référence au logement concerné par la facture
type VARCHAR(100), -- Type de la facture (ex. : eau, électricité)
amount INTEGER, -- Montant de la facture
value INTEGER, -- Valeur de la consommation en ressource
insert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Horodatage de l'ajout de l'enregistrement de la facture
FOREIGN KEY (housing_id) REFERENCES Housing(housing_id) -- Lien entre la facture et un logement spécifique
);

-- Créer la table Room pour stocker les informations sur les pièces dans chaque logement
CREATE TABLE Room (
    room_id INTEGER PRIMARY KEY, 
    housing_id INTEGER,
    name VARCHAR(100),
    x FLOAT,
    y FLOAT,
    z FLOAT,
    gltf_model VARCHAR(100) DEFAULT NULL,  -- Fix here: Comma instead of semicolon
    FOREIGN KEY (housing_id) REFERENCES Housing(housing_id)
);


-- Créer la table SensorType pour stocker les différents types de capteurs/actionneurs
CREATE TABLE SensorType (
type_id INTEGER PRIMARY KEY, -- Identifiant unique pour chaque type de capteur ou actionneur
name VARCHAR(100), -- Nom du type (ex. : capteur de température, actionneur de lumière)
unit_of_measurement VARCHAR(20), -- Unité de mesure pour ce type de capteur (ex. : Celsius, Watts)
precision_range VARCHAR(20) -- Plage de précision pour ce type de capteur
);

-- Créer la table Sensor pour stocker les informations sur les capteurs/actionneurs installés dans les pièces
CREATE TABLE Sensor (
    sensor_id INTEGER PRIMARY KEY, -- Identifiant unique pour chaque capteur ou actionneur
    room_id INTEGER, -- Référence à la pièce où le capteur est installé
    type_id INTEGER, -- Référence au type de capteur/actionneur
    commercial_reference VARCHAR(50), -- Référence commerciale du capteur/actionneur
    communication_port VARCHAR(50), -- Port utilisé pour la communication avec le capteur/actionneur
    x_coordinate FLOAT, -- Coordonnée X du capteur
    y_coordinate FLOAT, -- Coordonnée Y du capteur
    z_coordinate FLOAT, -- Coordonnée Z du capteur
    insert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Horodatage de l'ajout de l'enregistrement du capteur
    FOREIGN KEY (room_id) REFERENCES Room(room_id), -- Lien entre le capteur et une pièce spécifique
    FOREIGN KEY (type_id) REFERENCES SensorType(type_id) -- Lien entre le capteur et un type spécifique
);

-- Créer la table Measurements pour stocker les données collectées par les capteurs
CREATE TABLE Measurements (
measurement_id INTEGER PRIMARY KEY, -- Identifiant unique pour chaque mesure
sensor_id INTEGER, -- Référence au capteur qui a pris la mesure
value FLOAT, -- Valeur enregistrée par le capteur
insert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Horodatage de l'enregistrement de la mesure
FOREIGN KEY (sensor_id) REFERENCES Sensor(sensor_id) -- Lien entre la mesure et un capteur spécifique
);

-- Ajouter un logement
INSERT INTO Housing (housing_id, address, phone_number, ip_address, insert_date)
VALUES (1, '5 rue pierre wacquant Meudon 92190', '0602675408', '172.20.10.3', CURRENT_TIMESTAMP);

-- Ajouter des pièces au logement
INSERT INTO Room (room_id, housing_id, name, x, y, z) VALUES (1, 1, 'Salon', 0, 0, 0);
INSERT INTO Room (room_id, housing_id, name, x, y, z) VALUES (2, 1, 'Cuisine', 1, 0, 0);
INSERT INTO Room (room_id, housing_id, name, x, y, z) VALUES (3, 1, 'Chambre', 0, 1, 0);
INSERT INTO Room (room_id, housing_id, name, x, y, z) VALUES (4, 1, 'Salle de bain', 1, 1, 0);
INSERT INTO Room (room_id, housing_id, name, x, y, z) VALUES (5, 1, 'salle de jeu', 1, 1, 1);

-- Ajouter des types de capteurs/actionneurs
INSERT INTO SensorType (type_id, name, unit_of_measurement, precision_range)
VALUES (1, 'Temperature Sensor', 'Celsius', '0.1 - 100');

INSERT INTO SensorType (type_id, name, unit_of_measurement, precision_range)
VALUES (2, 'Light Sensor', 'Lux', '0 - 1000');

INSERT INTO SensorType (type_id, name, unit_of_measurement, precision_range)
VALUES (3, 'Motion Detector', 'Boolean', '0 - 1');

INSERT INTO SensorType (type_id, name, unit_of_measurement, precision_range)
VALUES (4, 'CO2 Sensor', 'percentage', '0 - 100');

INSERT INTO Sensor (sensor_id, room_id, type_id, commercial_reference, communication_port, x_coordinate, y_coordinate, z_coordinate, insert_date)
VALUES (1, 1, 1, 'Ref1234', 'PortA', 0, 0, 0, CURRENT_TIMESTAMP);

INSERT INTO Sensor (sensor_id, room_id, type_id, commercial_reference, communication_port, x_coordinate, y_coordinate, z_coordinate, insert_date)
VALUES (2, 2, 2, 'Ref5678', 'PortB', 0, 0, 0, CURRENT_TIMESTAMP);


INSERT INTO Measurements (measurement_id, sensor_id, value, insert_date)
VALUES (1, 1, 23.5, CURRENT_TIMESTAMP);

INSERT INTO Measurements (measurement_id, sensor_id, value, insert_date)
VALUES (2, 1, 24.0, CURRENT_TIMESTAMP);


INSERT INTO Measurements (measurement_id, sensor_id, value, insert_date)
VALUES (3, 2, 15.7, CURRENT_TIMESTAMP);

INSERT INTO Measurements (measurement_id, sensor_id, value, insert_date)
VALUES (4, 2, 16.2, CURRENT_TIMESTAMP);

-- Ajouter des factures au logement en rapport avec les capteurs/actionneurs
INSERT INTO Invoice (invoice_id, housing_id, type, amount, value, insert_date)
VALUES (1, 1, 'Electricity (Heating Managed by Temperature Sensor)', 120, 350, CURRENT_TIMESTAMP);

INSERT INTO Invoice (invoice_id, housing_id, type, amount, value, insert_date)
VALUES (2, 1, 'Electricity (fan optimization by CO2 Sensor)', 90, 300, CURRENT_TIMESTAMP);

INSERT INTO Invoice (invoice_id, housing_id, type, amount, value, insert_date)
VALUES (3, 1, 'Water (Optimized by Motion Detector)', 50, 150, CURRENT_TIMESTAMP);

INSERT INTO Invoice (invoice_id, housing_id, type, amount, value, insert_date)
VALUES (4, 1, 'Gas (Heating Optimization by Temperature Sensor)', 60, 250, CURRENT_TIMESTAMP);