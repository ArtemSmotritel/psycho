package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"psycho/backend/internal/server"
)

func main() {
	// Create new server instance
	srv, err := server.NewServer()
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	// Handle graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := srv.Start(); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-quit
	log.Println("Shutting down server...")

	// Close server resources
	if err := srv.Close(); err != nil {
		log.Printf("Error during server shutdown: %v", err)
	}

	log.Println("Server stopped")
} 