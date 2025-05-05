package server

import (
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/spf13/viper"
	"go.uber.org/zap"
	socketio "github.com/googollee/go-socket.io"
)

type Server struct {
	router *gin.Engine
	db     *sqlx.DB
	logger *zap.Logger
	config *viper.Viper
	socket *socketio.Server
}

func NewServer() (*Server, error) {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		return nil, err
	}

	// Initialize configuration
	config := viper.New()
	if err := initConfig(config); err != nil {
		return nil, err
	}

	// Initialize database
	db, err := initDB(config)
	if err != nil {
		return nil, err
	}

	// Initialize Socket.IO
	socket, err := initSocket()
	if err != nil {
		return nil, err
	}

	// Initialize router
	router := gin.Default()

	return &Server{
		router: router,
		db:     db,
		logger: logger,
		config: config,
		socket: socket,
	}, nil
}

func (s *Server) Start() error {
	// Configure CORS
	s.router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Socket.IO handler
	s.router.GET("/socket.io/*any", gin.WrapH(s.socket))
	s.router.POST("/socket.io/*any", gin.WrapH(s.socket))

	// Initialize routes
	// TODO: Add route initialization

	// Start server
	port := s.config.GetString("server.port")
	if port == "" {
		port = "8080"
	}

	s.logger.Info("Starting server", zap.String("port", port))
	return s.router.Run(":" + port)
}

func (s *Server) Close() error {
	if s.db != nil {
		if err := s.db.Close(); err != nil {
			return err
		}
	}
	if s.logger != nil {
		s.logger.Sync()
	}
	return nil
}

func initConfig(v *viper.Viper) error {
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("./config")

	// Set default values
	v.SetDefault("server.port", "8080")
	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.user", "postgres")
	v.SetDefault("database.password", "postgres")
	v.SetDefault("database.name", "psycho")

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error if we have defaults
			return nil
		}
		return err
	}

	return nil
}

func initDB(config *viper.Viper) (*sqlx.DB, error) {
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

	return db, nil
}

func initSocket() (*socketio.Server, error) {
	server := socketio.NewServer(&engineio.Options{
		Transports: []transport.Transport{
			&websocket.Transport{},
		},
	})

	server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		log.Println("connected:", s.ID())
		return nil
	})

	server.OnEvent("/", "notice", func(s socketio.Conn, msg string) {
		log.Println("notice:", msg)
		s.Emit("reply", "have "+msg)
	})

	server.OnError("/", func(s socketio.Conn, e error) {
		log.Println("meet error:", e)
	})

	server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Println("closed", reason)
	})

	go func() {
		if err := server.Serve(); err != nil {
			log.Fatalf("socketio listen error: %s\n", err)
		}
	}()

	return server, nil
} 