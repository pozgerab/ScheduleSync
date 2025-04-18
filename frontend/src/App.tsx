import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  ArrowUpDown,
  CloudDownload,
  CloudUpload,
  RefreshCcw,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  GetOrgName,
  ZipDirectory,
  UploadFile,
  DownloadFile,
  UnzipFile,
} from "../wailsjs/go/main/utils";
import {
  GetSaves,
  GetCurrentConfig,
  WriteConfig,
} from "../wailsjs/go/main/Config";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { main } from "wailsjs/go/models";
import { Button } from "./components/ui/button";

const pages = ["Sync", "Config"];
const DATE_FORMAT = "MM_dd-mm_ss";

function App() {
  const [currentConfig, setCurrentConfig] = useState<main.Config>({
    save_slot: 4,
    steamid: "",
    blob_name: "",
    bucket_name: "",
  });
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [saves, setSaves] = useState<Array<SaveType>>([]);
  const [orgNames, setOrgNames] = useState<Array<string | undefined>>([]);
  const [canSaveConfig, setCanSaveConfig] = useState(false);

  async function upload() {
    try {
      const zipPath = await ZipDirectory(
        currentConfig,
        `upl_${format(new Date(), DATE_FORMAT)}`
      );
      UploadFile(zipPath, currentConfig).then(() =>
        toast("Successfully uploaded")
      );
    } catch (err: unknown) {
      console.log(err);
      toast(err as string);
    }
  }

  async function download() {
    try {
      const dest = await DownloadFile(
        `dl_${format(new Date(), DATE_FORMAT)}.zip`,
        currentConfig
      );
      UnzipFile(dest, currentConfig).then(() =>
        toast("Successfully downloaded world")
      );
    } catch (err: unknown) {
      console.log(err);
      toast(err as string);
    }
  }

  function isEmptySelected() {
    return orgNames[currentConfig.save_slot] == undefined;
  }

  function emptySlots() {
    const allSlots = [0, 1, 2, 3, 4];
    saves
      .map((val) => val.id)
      .forEach((id) => {
        allSlots[id] = -1;
      });
    return allSlots.filter((val) => val != -1);
  }

  useEffect(() => {
    GetCurrentConfig()
      .then((data) => {
        setCurrentConfig({ ...data });
      })
      .finally(() => {
        setCanSaveConfig(true);
      });
  }, []);

  function refreshData() {
    GetSaves(currentConfig).then((data) => {
      const saves = data
        .filter((val) => val != 0)
        .map((save) => ({
          id: save - 1,
          slot: save,
        }));
      setSaves(saves);
      saves.forEach((save) => {
        GetOrgName(currentConfig, save.slot).then((data) => {
          setOrgNames((prev) => {
            prev[save.id] = data;
            return prev;
          });
        });
      });
      toast("Refreshed");
    });
  }

  function writeConfig() {
    if (canSaveConfig) {
      WriteConfig(currentConfig).then(() => {
        console.log("Wrote config");
      });
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effectRefresh = useCallback(refreshData, [currentConfig.steamid]);

  useEffect(() => {
    effectRefresh();
  }, [currentConfig.steamid, effectRefresh]);

  function saveSlotChange(slot?: number) {
    if (slot == undefined) return;
    setCurrentConfig((prev) => ({
      ...prev,
      save_slot: slot,
    }));
  }

  return (
    <>
      <nav className="flex justify-between w-auto h-16 items-center text-4xl border-b-3 m-5">
        {pages[currentPage]}
        <button className="switch w-auto">
          <ArrowUpDown
            onClick={() => {
              setCurrentPage((prev) => (prev + 1) % 2);
            }}
            className="w-auto rounded-2xl hover:scale-125 hover:bg-accent m-4 h-10 p-1 duration-200"
          />
        </button>
      </nav>
      {currentPage == 1 ? (
        <ConfigPage
          currentConfig={currentConfig}
          setCurrentConfig={setCurrentConfig}
          setSlot={saveSlotChange}
          refreshData={refreshData}
          writeConfig={writeConfig}
          availableSaves={saves
            .map((save) => ({
              ...save,
              orgName: orgNames[save.id],
            }))
            .concat(
              emptySlots().map((val) => ({
                id: val,
                slot: val + 1,
                orgName: undefined,
              }))
            )
            .sort((val1, val2) => val1.id - val2.id)}
        />
      ) : (
        <SyncPage
          can_upload={!isEmptySelected()}
          onUpload={upload}
          onDownload={download}
        />
      )}
      <Toaster />
    </>
  );
}

function ConfigPage({
  currentConfig,
  setCurrentConfig,
  writeConfig,
  availableSaves,
  refreshData,
}: {
  currentConfig: main.Config;
  setCurrentConfig: React.Dispatch<React.SetStateAction<main.Config>>;
  setSlot: (ord?: number) => void;
  writeConfig: () => void;
  availableSaves: SaveType[];
  refreshData: () => void;
}) {
  return (
    <div className="p-5">
      <div className="grid grid-cols-2 gap-1 *:p-5 items-center content-center justify-center **:text-lg *:odd:place-self-end">
        <Label>Steam ID</Label>
        <Input
          type="number"
          placeholder="id"
          className="place-self-start w-80 self-center"
          onBlur={writeConfig}
          onChange={(event) =>
            setCurrentConfig((prev) => ({
              ...prev,
              steamid: event.target.value,
            }))
          }
          value={currentConfig.steamid}
        />
        <Label>Synced Slot</Label>
        <div className="flex p-0! gap-3">
          <Select
            defaultValue={currentConfig.save_slot.toString()}
            onValueChange={(newVal) => {
              setCurrentConfig((prev) => ({
                ...prev,
                save_slot: Number.parseInt(newVal),
              }));
              writeConfig();
            }}
          >
            <SelectTrigger className="p-5">
              <SelectValue placeholder="slot" />
            </SelectTrigger>
            <SelectContent>
              <>
                {availableSaves.map((save) => {
                  return (
                    <SelectItem value={save.id.toString()} key={save.id}>
                      {`${
                        save.orgName == undefined ? "Empty Slot" : save.orgName
                      } (${save.slot})`}
                    </SelectItem>
                  );
                })}
              </>
            </SelectContent>
          </Select>
          <Button onClick={refreshData}>
            <RefreshCcw />
          </Button>
        </div>
        <Label>Bucket Name</Label>
        <Input
          type="text"
          placeholder="bucket-name"
          className="place-self-start w-80 self-center"
          onBlur={writeConfig}
          onChange={(event) =>
            setCurrentConfig((prev) => ({
              ...prev,
              bucket_name: event.target.value,
            }))
          }
          value={currentConfig.bucket_name}
        />
        <Label>Blob Name</Label>
        <Input
          type="text"
          placeholder="blob-name"
          className="place-self-start w-80 self-center"
          onBlur={writeConfig}
          onChange={(event) =>
            setCurrentConfig((prev) => ({
              ...prev,
              blob_name: event.target.value,
            }))
          }
          value={currentConfig.blob_name}
        />
      </div>
    </div>
  );
}

type SaveType = {
  orgName?: string;
  slot: number;
  id: number;
};

function SyncPage({
  can_upload,
  onUpload,
  onDownload,
}: {
  can_upload: boolean;
  onUpload: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex justify-center">
      <div className="p-5 grid grid-cols-1 gap-10 justify-center items-center *:rounded-xl syncdiv">
        <button
          onClick={() => onUpload()}
          disabled={!can_upload}
          className={`flex p-4 justify-center gap-4 text-4xl${
            can_upload ? "" : " transform-none! line-through decoration-solid"
          }`}
        >
          <CloudUpload size={40} className="self-center" />
          Upload
        </button>
        {can_upload == true ? (
          <AlertDialog>
            <AlertDialogTrigger>
              <button className="flex justify-center gap-4 text-4xl">
                <CloudDownload size={40} />
                Download
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The current world at the
                  selected slot will be replaced to the one in the cloud.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDownload()}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <button
            onClick={() => onDownload()}
            className="flex justify-center gap-4 text-4xl"
          >
            <CloudDownload size={40} />
            Download
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
