# CSV Import Guide for PropertyHub Admin

To import real estate projects into PropertyHub, your CSV file must follow the structure below. Each row represents a single project.

### Required CSV Columns

The header row of your CSV should include these exact column names:

1.  **name**: The name of the project (e.g., "Skyline Towers").
2.  **city**: The city name. Must match an existing city in the database.
3.  **district**: The district name. Must match an existing district within the specified city.
4.  **developer**: The name of the developer company. Must match an existing developer.
5.  **price_from**: Numerical value for the starting price (e.g., `250000`).
6.  **currency**: 3-letter currency code (e.g., `USD`, `AMD`, `RUB`).
7.  **completion_date**: Estimated completion date in `YYYY-MM-DD` or `MM/DD/YYYY` format.
8.  **address**: Full physical address of the project.
9.  **description**: A detailed description of the project features and amenities.
10. **cover_image_url**: URL to the project's main hero image.
11. **banks**: A comma-separated list of bank names that partner with this project (e.g., "Ameriabank, HSBC").

### Important Tips

*   **Case Sensitivity**: Names for cities, districts, and developers should match the existing records exactly.
*   **Encoding**: Ensure your file is saved with **UTF-8** encoding to preserve Armenian or Russian characters.
*   **Empty Values**: If a field is not available, leave the cell empty, but keep the column in the CSV.
