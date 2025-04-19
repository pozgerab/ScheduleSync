import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  ArrowUpDown,
  CloudDownload,
  CloudUpload,
  FolderCog,
  Info,
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
  ListBuckets,
  OpenConfigDir,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipWrapper,
} from "@/components/ui/tooltip";
import React from "react";

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
  const [buckets, setBuckets] = useState<Array<string>>([]);
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
    GetCurrentConfig().then((data) => {
      setCurrentConfig({ ...data });
      ListBuckets()
        .then((buckets) => {
          setBuckets(buckets);
        })
        .finally(() => {
          setCanSaveConfig(true);
        });
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

  function writeConfig(config: main.Config) {
    if (canSaveConfig) {
      WriteConfig(config).then(() => {
        toast("Wrote config");
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
      <nav className="flex justify-between w-auto h-16 items-center text-4xl border-b-3 m-5 p-2">
        {pages[currentPage]}
        <div className="flex gap-10 *:self-center *:p-0!">
          <TooltipProvider>
            <Tooltip delayDuration={600}>
              <TooltipTrigger>
                <Info size={32} />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm max-w-60 p-2">
                  To authenticate copy your google service account credentials
                  JSON file to the config folder and rename it to
                  "credentials.json"
                  <br />
                  <br /> Make sure the service account has all the necessary
                  access to manage the bucket and objects
                  <br />
                  <br />
                  <b className="uppercase text-[0.9rem]">
                    You should only share this with those who you will play with
                    and trust
                  </b>
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipWrapper title="Open Config Folder">
            <Button
              variant="ghost"
              size="icon"
              onClick={OpenConfigDir}
              className="hover:scale-150 scale-200 hoever:p-[-10px]"
            >
              <FolderCog size={32} />
            </Button>
          </TooltipWrapper>
          <TooltipWrapper title="Switch Page">
            <Button
              variant="ghost"
              size="icon"
              className="hover:scale-150 scale-200 hoever:p-[-10px]"
              onClick={() => {
                setCurrentPage((prev) => (prev + 1) % 2);
              }}
            >
              <ArrowUpDown size={32} />
            </Button>
          </TooltipWrapper>
        </div>
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
          buckets={buckets}
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
  buckets,
  refreshData,
}: {
  currentConfig: main.Config;
  setCurrentConfig: React.Dispatch<React.SetStateAction<main.Config>>;
  setSlot: (ord?: number) => void;
  writeConfig: (config: main.Config) => void;
  availableSaves: SaveType[];
  buckets: string[];
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
          onBlur={() => {
            writeConfig(currentConfig);
          }}
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
              setCurrentConfig((prev) => {
                const updated = {
                  ...prev,
                  save_slot: Number.parseInt(newVal),
                };
                writeConfig(updated);
                return updated;
              });
            }}
          >
            <SelectTrigger className="p-5">
              <SelectValue placeholder="slot" />
            </SelectTrigger>
            <SelectContent>
              {availableSaves.map((save) => (
                <SelectItem value={save.id.toString()} key={save.id}>
                  {`${
                    save.orgName == undefined ? "Empty Slot" : save.orgName
                  } (${save.slot})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={refreshData}>
            <RefreshCcw />
          </Button>
        </div>
        <Label>Bucket Name</Label>
        <Select
          defaultValue={currentConfig.bucket_name}
          onValueChange={(newVal) => {
            setCurrentConfig((prev) => {
              const updated = {
                ...prev,
                bucket_name: newVal,
              };
              writeConfig(updated);
              return updated;
            });
            writeConfig(currentConfig);
          }}
        >
          <SelectTrigger className="p-5">
            <SelectValue placeholder="bucket-name" />
          </SelectTrigger>
          <SelectContent>
            {buckets.map((bucket) => (
              <SelectItem value={bucket} key={bucket}>
                {bucket}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label>Blob Name</Label>
        <Input
          type="text"
          placeholder="blob-name"
          className="place-self-start w-80 self-center"
          spellCheck={false}
          onBlur={() => {
            writeConfig(currentConfig);
          }}
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
                  selected slot will be replaced with the one in the cloud.
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
