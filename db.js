// Get current Vizzy version and table names
export const getDBInfo = () =>
  new Promise((res, rej) => {
    console.log("Requesting database metadata");

    const dbRequest = indexedDB.open("Vizzy");
    dbRequest.onerror = (error) => rej(error);

    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      res({ version: db.version, tables: [...db.objectStoreNames] });
    };
  });

// Get a Vizzy object store as an array of objects
export const getDBTable = (tableName) =>
  new Promise((res, rej) => {
    console.log("Requesting database to get", tableName);
    const dbRequest = indexedDB.open("Vizzy");

    dbRequest.onerror = (error) => {
      console.error(error);
      PageNav.showAlert(error.message);
      rej(error);
    };

    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const transaction = db.transaction(tableName);
      const table = transaction.objectStore(tableName);

      console.log(`Retrieving data for ${tableName}`);
      const dataRequest = table.getAll();

      dataRequest.onerror = (error) => {
        console.error(error);
        PageNav.showAlert(error.message);
        rej(error);
      };

      dataRequest.onsuccess = () => res(dataRequest.result);
    };
  });

// Insert an uploaded danfo dataframe into the Vizzy IDB
export const insertDBTable = (fileName, fileData) =>
  new Promise(async (res, rej) => {
    const dbInfo = JSON.parse(sessionStorage.getItem("Vizzy"));

    const exists = dbInfo.tables.includes(fileName);
    if (exists) return await replaceDBTable(fileName, fileData);

    console.log("Requesting database to insert", fileName);
    const dbRequest = indexedDB.open("Vizzy", ++dbInfo.version);
    dbRequest.onerror = (error) => rej(error);

    dbRequest.onupgradeneeded = () => {
      const db = dbRequest.result;
      const table = db.createObjectStore(fileName, { autoIncrement: true });

      console.log(`Inserting table ${fileName}`);
      fileData.forEach((row) => table.add(row));

      dbInfo.tables = [...dbInfo.tables, fileName];
      sessionStorage.setItem("Vizzy", JSON.stringify(dbInfo));
      res(dbInfo);
    };
  });

// Replace a Vizzy IDB object store's data with new data
export const replaceDBTable = (fileName, fileData) =>
  new Promise((res, rej) => {
    console.log("Requesting database to replace", fileName);

    const dbRequest = indexedDB.open("Vizzy");
    dbRequest.onerror = (error) => rej(error);

    dbRequest.onsuccess = () => {
      const db = dbRequest.result;
      const transaction = db.transaction(fileName, "readwrite");
      const table = transaction.objectStore(fileName);

      console.log(`Replacing table ${fileName}`);
      const clearRequest = table.clear();
      clearRequest.onerror = (error) => rej(error);

      clearRequest.onsuccess = () => {
        fileData.forEach((row) => table.add(row));
        res();
      };
    };
  });

// Delete a Vizzy IDB object store
export const deleteDBTable = (tableName) =>
  new Promise((res, rej) => {
    const dbInfo = JSON.parse(sessionStorage.getItem("Vizzy"));

    console.log("Requesting database to delete", tableName);
    const dbRequest = indexedDB.open("Vizzy", ++dbInfo.version);

    dbRequest.onerror = (error) => {
      console.error(error);
      PageNav.showAlert(error.message);
      rej(error);
    };

    dbRequest.onupgradeneeded = async () => {
      const db = dbRequest.result;
      console.log(`Deleting table ${tableName}`);

      db.deleteObjectStore(tableName);
      dbInfo.tables = dbInfo.tables.filter((table) => table !== tableName);

      sessionStorage.setItem("Vizzy", JSON.stringify(dbInfo));
      res(dbInfo);
    };
  });
