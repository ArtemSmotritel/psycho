package database

import (
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jmoiron/sqlx"
	"github.com/spf13/viper"
)

type Database struct {
	DB *sqlx.DB
}

func NewDatabase(config *viper.Viper) (*Database, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.GetString("database.host"),
		config.GetInt("database.port"),
		config.GetString("database.user"),
		config.GetString("database.password"),
		config.GetString("database.name"),
		config.GetString("database.ssl_mode"),
	)

	db, err := sqlx.Connect("pgx", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Successfully connected to database")
	return &Database{DB: db}, nil
}

func (d *Database) Close() error {
	if d.DB != nil {
		return d.DB.Close()
	}
	return nil
} 