library(plumber)

# Load your Plumber API file
api <- plumber::plumb("./plumber.R")

# Run the API
api$run(host = "127.0.0.1", port = 9396)