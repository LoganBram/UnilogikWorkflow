require("dotenv").config();
const request = require("request-promise-native");
const NodeCache = require("node-cache");
const matches = [];
const SKU = require("../sku.js");

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

const CleanIncomingData = async (incomingdata) => {
  return null;
};
//gets all SKU values from product page on hubspot
const getAllProductSKU = async (accessToken) => {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const result = await request.get(
      "https://api.hubapi.com/crm-objects/v1/objects/products/paged?properties=hs_sku",
      {
        headers: headers,
      }
    );

    console.log("Obtained SKU'S from product page, here is one");
    x = JSON.parse(result);
    console.log(x.objects[0].properties.hs_sku.value);

    return JSON.parse(result);
  } catch (e) {
    console.error("  > Unable to retrieve contact");
    return JSON.parse(e.response.body);
  }
};

//takes the productpage of SKU's and compares to SKU's passed to us from pricesheet
//returns all object id's of the products via the SKU comparison
//object ID's are used to create line items with the correct item
const MatchSKUs_GetProductid = (res, pricesheetdata, ProductPageSKUs) => {
  if (ProductPageSKUs.status === "error") {
    res.write(
      `<p>Unable to retrieve contact! Error Message: ${ProductPageSKUs.message}</p>`
    );
    return;
  }

  //compares product page SKU values to our array of the SKU values we want,
  //then adds product ID of matching SKU's
  for (let i = 0; i < Object.keys(pricesheetdata[0]).length; i++) {
    for (let j = 0; j < ProductPageSKUs.objects.length; j++) {
      const key = "line" + (i + 1);
      console.log(key, "KEY");
      if (
        parseInt(pricesheetdata[0][key].sku) ==
          ProductPageSKUs.objects[j].properties.hs_sku.value ||
        pricesheetdata[0][key].sku ===
          ProductPageSKUs.objects[j].properties.hs_sku.value
      ) {
        pricesheetdata[0][key]["objectid"] =
          ProductPageSKUs.objects[j].objectId;
        matches.push(ProductPageSKUs.objects[j].objectId);
        console.log(
          "SKU VALUE:",
          pricesheetdata[0][key].sku,
          "matches with:",
          ProductPageSKUs.objects[j].properties.hs_sku.value,
          "adding product id:",
          ProductPageSKUs.objects[j].objectId,
          "to array that will be used for creation"
        );
      } else {
        console.log(
          "NOT MATCHED",
          pricesheetdata[0][key].sku,
          ProductPageSKUs.objects[j].properties.hs_sku.value
        );
      }
    }
  }

  //RETURN IT HERE
  return pricesheetdata;
};

//takes in array of object id's that have been filtered for only the ones to add
const AddItems = async (accessToken, ProductData_WithObjectid) => {
  //create token header
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  //add each item from the pricesheet to the deal
  const CreateLineItem = async (Product) => {
    const requestData = [
      {
        name: "hs_product_id",
        value: Product.objectid,
      },
      {
        name: "quantity",
        value: Product.quantity,
      },
      {
        name: "closedate",
        value: Product.enddate,
      },
      {
        name: "opendate",
        value: Product.startdate,
      },
    ];
    //sends post request to generate the line item with product details
    // holds the object id that is returned for the put assocation

    const x = await request(
      "https://api.hubapi.com/crm-objects/v1/objects/line_items",
      {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: headers,
      }
    );
    y = JSON.parse(x);
    return y.objectId;
    console.log("line item created");
  };

  const CreateDeal = async () => {
    const requestData = {
      properties: {
        dealname: "New Deal Demo",
      },
    };

    const request_response = await request(
      "https://api.hubapi.com/crm/v3/objects/deals",
      {
        method: "POST",
        body: JSON.stringify(requestData),
        headers: headers,
      }
    );
    response = JSON.parse(request_response);
    return response.id;
  };

  //uses objectID from lineitem post request to associate line item with deal
  const AssociateWithDeal = async (DealId, LineItemId) => {
    const assocdata = {
      fromObjectId: LineItemId,
      toObjectId: DealId,
      category: "HUBSPOT_DEFINED",
      definitionId: 20,
    };

    //sends put request with deal as tobojectid, and line item as fromobjectid
    fetch("https://api.hubapi.com/crm-associations/v1/associations", {
      method: "PUT",
      body: JSON.stringify(assocdata),
      headers: headers,
    }).then(console.log("association success"));
  };

  const DealId = await CreateDeal();
  const unmatchedlines = [];

  for (const product in ProductData_WithObjectid[0]) {
    //check if SKU was matched with hubspot product id
    if (ProductData_WithObjectid[0][product].hasOwnProperty("objectid")) {
      console.log(ProductData_WithObjectid[0][product], "has it");
      //creates line item with product/objectid
      const LineItemId = await CreateLineItem(
        ProductData_WithObjectid[0][product]
      );
      //associates line item with deal
      AssociateWithDeal(DealId, LineItemId);
    } else {
      unmatchedlines.push(ProductData_WithObjectid[0][product]);
    }
  }
  return unmatchedlines;
};

module.exports = {
  getAllProductSKU,
  MatchSKUs_GetProductid,
  AddItems,
  CleanIncomingData,
};
