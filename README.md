# FastAPI Application

This project is a FastAPI application designed to handle file uploads and validate metadata associated with the uploaded files. It follows the SOLID principles of software engineering to ensure maintainability and scalability.

## Project Structure

```
fastapi-app
├── src
│   ├── main.py               # Entry point of the FastAPI application
│   ├── api
│   │   └── upload.py         # Contains the upload endpoint
│   ├── models
│   │   └── metadata.py       # Defines data models for metadata
│   ├── services
│   │   └── validation_service.py # Logic for validating metadata types
│   ├── utils
│   │   └── type_utils.py     # Utility functions for type validation
│   └── types
│       └── index.py          # Defines types used throughout the application
├── requirements.txt           # Lists project dependencies
└── README.md                  # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd fastapi-app
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install the required dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

To run the FastAPI application, execute the following command:

```bash
uvicorn src.main:app --reload
```

You can access the API documentation at `http://127.0.0.1:8000/docs`.

## Features

- File upload handling with metadata validation.
- Support for various metadata types including string, integer, float, boolean, list, and datetime.
- Error handling for invalid metadata inputs.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.