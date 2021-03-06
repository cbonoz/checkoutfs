import React, { useState, useEffect } from "react";

import { Input, Button, Steps, Layout } from "antd";
import { FileDropzone } from "./FileDropzone";
import { storeFiles } from "../util/stor";
import { getCheckoutUrl, getIpfsUrl } from "../util/checkout";
import { createStream, initCeramic } from "../util/ceramic";
import { publish } from "../util/fluence";
import { toObject } from "./Contract/utils";

const { Header, Footer, Sider, Content } = Layout;

const { Step } = Steps;

const LAST_STEP = 3;
function Upload({ isLoggedIn, address }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [info, setInfo] = useState({ title: "My Checkout page", address: "" });
  const [result, setResult] = useState({});
  const [publishResult, setPublishResult] = useState();
  const [loading, setLoading] = useState(false);

  const ipnsPublish = async () => {
    setLoading(true);
    try {
      const res = await publish(result.cid);
      setPublishResult(res);
    } catch (e) {
      console.error("err", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("isLoggedIn", isLoggedIn);
    if (isLoggedIn && currentStep === 0) updateStep(1);
  }, [isLoggedIn]);

  const updateInfo = update => {
    setInfo({ ...info, ...update });
  };

  const updateStep = async offset => {
    const nextStep = currentStep + offset;

    if (nextStep === LAST_STEP) {
      if (!files) {
        alert("Please specify at least one file");
        return;
      }

      setLoading(true);

      // https://docs.web3.storage/how-tos/store/#preparing-files-for-upload
      try {
        await initCeramic(address);
      } catch (e) {
        console.error("error init", e); // Possibly already initialized - will error in create otherwise.
      }
      let cid;
      let streamId;
      try {
        streamId = await createStream(info);
        // streamId = 1;
        const blob = new Blob([JSON.stringify({ streamId })], { type: "application/json" });
        const infoFileName = `info_${streamId}.json`;
        const fileObjects = [...files.map(x => x), new File([blob], infoFileName)];
        cid = await storeFiles(fileObjects);
      } catch (e) {
        console.error("error uploading files", e);
        alert("Error uploading files: " + e.toString());
        return;
      } finally {
        setLoading(false);
      }

      const data = { cid, url: getCheckoutUrl(cid), streamId, ipfs: getIpfsUrl(cid) };
      console.log("upload", data);
      setResult(data);
    } else if (nextStep === 2) {
      if (!info.address || !info.title) {
        alert("Store name and payment address are required");
        return;
      }
    }

    setCurrentStep(nextStep);
  };

  const getBody = () => {
    switch (currentStep) {
      case 0: // confirm login
        return (
          <div>
            <h2 className="sell-header">Login</h2>
            <p>
              In order to create a listing, you must login with your metamask or wallet account. Click 'connect' in the
              top right to begin.
            </p>
          </div>
        );

      case 1:
        return (
          <div>
            <h2 className="sell-header">Enter page information:</h2>
            <Input
              addonBefore={"Title: "}
              placeholder="Enter title of page"
              value={info.title}
              onChange={e => updateInfo({ title: e.target.value })}
            />
            <Input
              addonBefore={"Address: "}
              placeholder="Enter payment address"
              value={info.address}
              onChange={e => updateInfo({ address: e.target.value })}
            />
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="sell-header">Enter page information</h2>
            <FileDropzone info={info} files={files} setFiles={setFiles} updateInfo={updateInfo} />
            {files.length > 0 && (
              <p>
                {files.length} Item{files.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        );

      case 3: // done
        return (
          <div className="complete-section">
            <h2 className="sell-header">Complete!</h2>
            <h5>Take note of the cid value below, you'll use this as storefront identifier.</h5>
            {Object.keys(result).map(k => {
              return (
                <li>
                  {k}: {JSON.stringify(result[k]).replaceAll('"', "")}
                </li>
              );
            })}
            <br />
            <h3>Listing information</h3>
            {Object.keys(info).map(k => {
              return (
                <li key={k}>
                  {k}: {JSON.stringify(info[k]).replaceAll('"', "")}
                </li>
              );
            })}

            {result.url && (
              <a href={result.url} target="_blank">
                Click here to view page.
              </a>
            )}

            <br />
            <p>Create a custom URL for your hosted page (demo)</p>
            <Button onClick={ipnsPublish} disabled={loading} loading={loading}>
              Publish to IPNS
            </Button>
            {publishResult && <pre className="align-left">{toObject(publishResult)}</pre>}
          </div>
        );
    }
  };

  return (
    <div className="content">
      <h1>Create a new CheckoutFS listing.</h1>
      <Header>
        <Steps current={currentStep}>
          <Step title="Login" description="Authenticate." />
          <Step title="Information" description="What page are you creating?" />
          <Step title="Upload" description="Add files and assets." />
          <Step title="Done" description="View your checkout page." />
        </Steps>
      </Header>
      <Content>
        <div className="sell-area">{getBody()}</div>
      </Content>
      <Footer>
        {(currentStep !== 0 || (currentStep !== 1 && !isLoggedIn)) && (
          <Button disabled={loading} type="primary" onClick={() => updateStep(-1)}>
            Previous
          </Button>
        )}
        &nbsp;
        {currentStep < LAST_STEP && (
          <Button disabled={loading} loading={loading} type="primary" onClick={() => updateStep(1)}>
            {currentStep === LAST_STEP - 1 ? "Done" : "Next"}
          </Button>
        )}
      </Footer>
    </div>
  );
}

export default Upload;
