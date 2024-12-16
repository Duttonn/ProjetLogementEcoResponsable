import sqlite3

def reset_database(sql_file: str, database: str):
    try:
        conn = sqlite3.connect(database)
        with open(sql_file, 'r') as f:
            sql_script = f.read()
        conn.executescript(sql_script)
        print("Database has been reset successfully.")
    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()

# Example usage
reset_database("logement.sql", "logement.db")
