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
        name: "Ryan Hills, Unilogik Systems",
        employee_phone: "778-589-4023",
        email: "ryan@unilogik.com",
      },
    },
    {
      user: {
        name: "Logan Bramwell, Unilogik Systems",
        employee_phone: "12365789",
        email: "logan@uniolgik.com",
      },
    },
  ];
  const [file, setFile] = useState();
  const [InvoiceTo, setInvoiceTo] = useState({});
  const [chosen, setChosen] = useState(options[0]);

  const handleFileChange = async (event) => {
    setFile(event.target.files[0]);
  };

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

      //counts how many rows to go down based on the C column in pricesheet
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
      let distcost = [];

      //nested for loop, first loop to access row, second loop to access each cell within each row
      //starts at two so it doesnt begin at the header row on the excel sheet
      for (let i = 2; i < rowcount + 2; i++) {
        //tempdata holds a row of data, adds it to the final data then resets for the next row creating nested array
        if (tempdata[0] !== undefined) {
          //adds null value because of merged cell in quote template
          //since a merged cell takes up two spots, we must add null for the second spot
          distcost.push(tempdata[10]);
          //ourcost push, spliced this value out previously but if i try to add it back to the
          //final data it will mess up the quote insertion positions, so have to make it its own thing
          tempdata.splice(3, 0, null);
          finaldata.push(tempdata);

          tempdata = [];
        }

        const row = worksheet.getRow(i);
        //add Item # for quote template
        tempdata.push(i - 1);

        //nested loop to access each cell in the row
        for (let j = 1; j < 16; j++) {
          const cellValue = row.getCell(j).value;
          //checks if the cell has a formula included and adds value accordingly
          //different adding method needed with library if it has a formula
          if (
            typeof cellValue === "object" &&
            cellValue !== null &&
            "result" in cellValue
          ) {
            //add to array, handles formulas
            tempdata.push(cellValue.result);
          } else {
            tempdata.push(cellValue);
            //add to array if no formula
          }
        }
      }

      //part 2 which is cleaning and adding the data to the excel file

      finaldata.forEach((innerArray) => {
        innerArray.splice(9, 4);
        innerArray.splice(11, 2);
      });

      console.log(finaldata);
      //adding data to the excel sheet
      let j = 23;
      //j keeps track of row to input at (always 23 due to the quote layout)
      //i iterates through data array

      for (let i = 0; i < finaldata.length; i++) {
        newWorksheet.insertRow(j, finaldata[i], "i+");
        newWorksheet.mergeCells("C" + j, ":D" + j);
        j++;
      }

      //Getting correct cell for employee name, phone, and email since it changes with the amount of rows added
      let nameposition = 41 + finaldata.length;
      let namecell = "A" + nameposition;
      let phoneposition = "A" + (nameposition + 1);
      let emailposition = "A" + (nameposition + 2);
      //bug where customer signature gets repeated 3 times on copy over, cover it with a blank until issue is found
      //#1) isnt related to the amount of rows being added
      //gets position of customer signature glitch
      let custsign_glitchposition1 = "B" + (nameposition - 6);
      let custsign_glitchposition2 = "C" + (nameposition - 6);

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

      newWorksheet.getCell(namecell).value = chosen.name;
      newWorksheet.getCell(phoneposition).value = chosen.employee_phone;
      newWorksheet.getCell(emailposition).value = chosen.email;

      newWorksheet.getCell(custsign_glitchposition1).value = null;
      newWorksheet.getCell(custsign_glitchposition2).value = null;

      // Get today's date
      const date = new Date();

      // Define options for formatting the date
      const options = { year: "numeric", month: "long", day: "numeric" };

      // Format the date as "August 18, 2023"
      const formattedDate = date.toLocaleDateString("en-US", options);

      // Adds the formatted date to the desired cell
      newWorksheet.getCell("I2").value = formattedDate;

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

    //creates datarray object

    setTimeout(() => {
      const dataArray = finaldata.map((subarray) => ({
        sku: subarray[1],
        product: subarray[2],
        startdate: subarray[6],
        enddate: subarray[7],
        quantity: subarray[8],
        ourprice: subarray[9],
      }));

      let dictionary = {};
      //NEED THIS TO BE {line1:{sku: 123123,product: asdasdasd }, line2: {sku: 123123,product: asdasdasd}} before passing because order
      //get messed up when getting data on other side
      for (let i = 0; i < finaldata.length; i++) {
        const key = `line${i + 1}`;
        dictionary[key] = dataArray[i];
      }
      const dictionaryJson = JSON.stringify(dictionary);
      const encodedDictionary = encodeURIComponent(dictionaryJson);

      const redirectUrl = `http://localhost:3000/oauthtrigg/?data=${encodedDictionary}`;
      //redirect using data in url
      window.location.href = redirectUrl;
    }, 3000000);
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
