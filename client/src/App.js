import React, { useState } from "react";
import ExcelJS from "exceljs";
import "./App.css";
import "react-dropdown/style.css";
import axios from "axios";
//imports redirect method from backend to begin oauth workflow

let finaldata = [];

function FileProcessor() {
  const options = [
    {
      user: {
        name: "ryan",
        employee_phone: "1112223333",
        email: "ryan@unilogik.com",
      },
    },
    {
      user: {
        name: "logan",
        employee_phone: "12365789",
        email: "logan@uiolgik.com",
      },
    },
  ];
  const [file, setFile] = useState();
  const [InvoiceTo, setInvoiceTo] = useState({});
  const [chosen, setChosen] = useState(options[0]);

  const handleFileChange = async (event) => {
    setFile(event.target.files[0]);
  };
  //make new function for the rest of the code

  const handleInvoiceToChange = (event) => {
    const { name, value } = event.target;
    setInvoiceTo((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleDropdown = (e) => {
    const { value } = e.target;
    setChosen(options[value].user);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const reader = new FileReader();

    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);

      // get pricesheet
      const worksheet = workbook.getWorksheet(1);
      //get quote template
      const newWorksheet = workbook.getWorksheet("QuoteTemplate");

      let empty = false;
      let rowcount = 0;
      for (let i = 1; empty === false; i++) {
        let cell = "C" + i;
        const celldata = worksheet.getCell(cell).value;
        if (celldata === null) {
          break;
        } else {
          rowcount++;
        }
      }

      //once you have the column count transfer the information to template excel sheet

      let tempdata = [];

      //first loop to access a row, starts at two to start at data rows not headers in excel sheet
      for (let i = 2; i < rowcount + 2; i++) {
        //if there has been something added to tempdata then push it to finaldata and reset tempdata
        if (tempdata[0] !== undefined) {
          //adds null value because of merged cell in quote template
          tempdata.splice(3, 0, null);
          finaldata.push(tempdata);
          tempdata = [];
        }
        const row = worksheet.getRow(i);
        //add Item # for quote template first
        tempdata.push(i - 1);

        //second loop to access each cell in the row
        for (let j = 1; j < 16; j++) {
          const cellValue = row.getCell(j).value;
          if (
            typeof cellValue === "object" &&
            cellValue !== null &&
            "result" in cellValue
          ) {
            //add to array, handles formulas
            tempdata.push(cellValue.result);
          } else {
            tempdata.push(cellValue);
            //add to array
          }
        }
      }

      //part 2 which is cleaning and adding the data to the excel file

      finaldata.forEach((innerArray) => {
        innerArray.splice(9, 4);
        innerArray.splice(11, 2);
      });

      //j keeps track of row to input at
      //i iterates through data array

      //adding to excel sheet
      let j = 23;
      for (let i = 0; i < finaldata.length; i++) {
        newWorksheet.insertRow(j, finaldata[i], "i+");
        newWorksheet.mergeCells("C" + j, ":D" + j);
        j++;
      }

      //now adding the extra information inputted by user
      newWorksheet.getCell("A13").value = InvoiceTo.company;
      newWorksheet.getCell("A14").value = InvoiceTo.address;
      newWorksheet.getCell("A15").value = InvoiceTo.postal;
      newWorksheet.getCell("A16").value = InvoiceTo.name;
      newWorksheet.getCell("A17").value = InvoiceTo.email;
      newWorksheet.getCell("A18").value = InvoiceTo.phone;
      newWorksheet.getCell("H13").value = InvoiceTo.company;
      newWorksheet.getCell("H14").value = InvoiceTo.address;
      newWorksheet.getCell("H15").value = InvoiceTo.postal;
      newWorksheet.getCell("H16").value = InvoiceTo.name;
      newWorksheet.getCell("H17").value = InvoiceTo.email;
      newWorksheet.getCell("H18").value = InvoiceTo.phone;
      newWorksheet.getCell("I3").value = InvoiceTo.po;
      newWorksheet.getCell("I4").value = InvoiceTo.quotenumber;
      newWorksheet.getCell("I6").value = InvoiceTo.transactiontype;
      newWorksheet.getCell("I7").value = InvoiceTo.psttaxable;
      newWorksheet.getCell("I8").value = InvoiceTo.pstexempt;
      newWorksheet.getCell("K35").value = InvoiceTo.terms;
      newWorksheet.getCell("A50").value = chosen.name;
      newWorksheet.getCell("A51").value = chosen.employee_phone;
      newWorksheet.getCell("A52").value = chosen.email;

      //get todays date
      const date = new Date();
      //changes date to local time based on user
      newWorksheet.getCell("I2").value = date.toLocaleDateString("en-US");

      console.log("New workbook created successfully!");

      //moves over to new file here, doesnt save the template with the new data
      // Generate download link for the processed file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "processed_file.xlsx";
      downloadLink.click();
      downloadLink.remove();
    };

    reader.readAsArrayBuffer(file);
    //set timeout to allow time for the file to download
    //CHANGE THIS TO AWAIT FUNCTION LATER

    //trying post request to pass data instead of in the url, not sure
    //if it will work

    setTimeout(() => {
      const skuarray = finaldata.map((subarray) => subarray[1]);
      const grs = skuarray.join(",");
      // Run the redirect function to begin OAuth functionality
      window.location.href = `http://localhost:3000/oauthtrigg/?array=${grs}`;
    }, 5000);
  };

  return (
    <>
      <div className="title">
        <h1>Unilogik Quote Generator</h1>
      </div>
      <div className="formwrapper">
        <form onSubmit={submitForm} className="submitform">
          <div className="choosefilebox">
            <label>Upload Pricesheet:</label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              className="filebutton"
            />
          </div>
          <InvoiceToDisplay
            handleInvoiceToChange={handleInvoiceToChange}
            handleDropdown={handleDropdown}
            chosen={chosen}
          />
          <button type="submit" className="submitbutton">
            Submit
          </button>
        </form>
      </div>
    </>
  );
}

function InvoiceToDisplay({ handleInvoiceToChange, handleDropdown, chosen }) {
  return (
    <>
      <div className="FormBox">
        <div className="ReceiverInfoWrap">
          <h1>Reciever Information</h1>
          <label>
            Company name
            <input
              type="text"
              name="company"
              onChange={handleInvoiceToChange}
            />
          </label>

          <label>
            Address
            <input
              type="text"
              name="address"
              onChange={handleInvoiceToChange}
            />
          </label>

          <label>
            Postal
            <input type="text" name="postal" onChange={handleInvoiceToChange} />
          </label>

          <label>
            Name
            <input type="text" name="name" onChange={handleInvoiceToChange} />
          </label>

          <label>
            Email
            <input type="text" name="email" onChange={handleInvoiceToChange} />
          </label>

          <label>
            Phone
            <input type="text" name="phone" onChange={handleInvoiceToChange} />
          </label>
        </div>
        <div className="otherareawrap">
          <h1> Other </h1>
          <label>
            PO #
            <input type="text" name="po" onChange={handleInvoiceToChange} />
          </label>

          <label>
            Quote Number
            <input
              type="text"
              name="quotenumber"
              onChange={handleInvoiceToChange}
            />
          </label>

          <label>
            Transaction Type
            <input
              type="text"
              name="transactiontype"
              onChange={handleInvoiceToChange}
            />
          </label>

          <label>
            PST Taxable
            <input
              type="text"
              name="psttaxable"
              onChange={handleInvoiceToChange}
            />
          </label>

          <label>
            PST Exempt #
            <input
              type="text"
              name="pstexempt"
              onChange={handleInvoiceToChange}
            />
          </label>

          <label>
            Terms
            <input type="text" name="terms" onChange={handleInvoiceToChange} />
          </label>

          <label>
            User
            <EmployeeDropdown handleDropdown={handleDropdown} chosen={chosen} />
          </label>
        </div>
      </div>
    </>
  );
}

function EmployeeDropdown({ handleDropdown, chosen }) {
  //value tells what index of the options array to use
  return (
    <select onChange={handleDropdown} defaultValue={chosen}>
      <option name="ryan" value="0">
        ryan
      </option>
      <option name="logan" value="1">
        logan
      </option>
    </select>
  );
}

export default FileProcessor;
