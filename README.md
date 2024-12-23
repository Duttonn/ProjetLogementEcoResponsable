

# Three.js + FastAPI Vite Project: Logement Éco-Responsable

Bienvenue dans le projet **Logement Éco-Responsable** !  
Ce projet propose une application web interactive intégrant **Three.js** pour la visualisation 3D, javascript et html/CSS pour le site et **FastAPI** pour le backend, dans le cadre du TP IoT "Logement Éco-Responsable". L'objectif est de permettre aux utilisateurs de surveiller et réduire leur consommation énergétique à l'aide de capteurs connectés.

---

## Table des Matières
- [Présentation du Projet](#présentation-du-projet)
- [Prérequis](#prérequis)
- [Instructions de Setup](#instructions-de-setup)
- [Windows](#windows)
- [Linux/Mac](#linuxmac)
- [Lancement du Projet](#lancement-du-projet)
- [Annexe](#annexe)

---

## Présentation du Projet
Le projet **Logement Éco-Responsable** vise à offrir une application clé en main permettant aux particuliers de suivre et gérer leur consommation d’énergie, d’eau et autres ressources.  
Grâce à l'intégration de capteurs IoT (température, luminosité, eau, etc.), les utilisateurs pourront visualiser leurs consommations et programmer des actions automatiques (comme fermer les volets ou couper l'électricité) en fonction des données reçues.  

### Technologies Utilisées
- **Frontend** : Three.js, Vite, HTML/CSS, javascript
- **Backend** : FastAPI
- **Base de Données** : SQLite3
- **API Externes** : Données météorologiques (Open météo), factures (Google Charts)

---

## Prérequis
Assurez-vous d'avoir les éléments suivants installés :  
- **Node.js** (v16+)  
- **npm** (v8+)  
- **Python 3.8+**  

---

## Instructions de Setup

### 1. Cloner le repo
```bash
git clone https://github.com/your-username/three_vite_project.git
cd three_vite_project
```

### 2. Installer les Dépendances
```bash
npm install
```
Cela installe les dépendances Node.js et crée un environnement virtuel Python (`venv`), tout en installant les modules nécessaires à partir de `requirements.txt`.

---

## Lancement du Projet

### 1. Générer fichiers dist
```bash
npm run build
```

### 2. Démarrer le Backend (FastAPI)
```bash
npm run start-python
```
L'API FastAPI sera accessible à l'adresse **http://127.0.0.1:8000**.

---

## Annexe

### Commandes Utiles
- **Créer un environnement virtuel Python**  
```bash
npm run create-venv
```
- **Installer les dépendances Python**  
```bash
npm run install-python
```
- **Activer l'environnement virtuel**  
```bash
npm run activate-venv
```
- **Générer un `requirements.txt` à jour**  
```bash
npm run generate-requirements
```

### Scripts de Développement
- **`npm run build`** : Build du projet pour la production  
- **`npm run preview`** : Prévisualiser la version buildée  
- **`npm run clean`** : Supprime le dossier `dist`  

---

## Notes
- Pour toute anomalie, consultez la section [Troubleshooting](#troubleshooting) dans l'annexe.
- Le projet est compatible avec **Windows**, **Linux** et **MacOS**. Des ajustements peuvent être nécessaires pour les chemins d'accès Python sous Windows.

---

## License
Ce projet est sous licence MIT.
