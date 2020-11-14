import { action, makeAutoObservable } from 'mobx';
import { DateTime } from 'luxon';

import { getCPUData } from 'src/api/cpu/get-cpu-data';
import { createCPUData } from 'src/api/cpu/create-cpu-data';

const zone = 'Europe/Moscow';

interface CPUFrame {
  x?: string;
  y?: number;
}

interface CPUData {
  title: string;
  latestUsage: number;
  cpuData: Array<CPUFrame>;
}

class CpuDataStore {
  isLoading: boolean = false;
  counter: number = 0;
  lines: CPUData = {
    title: '',
    latestUsage: 0,
    cpuData: [],
  };

  constructor() {
    makeAutoObservable(this);
  }

  addCpuDataManually(usage: number) {
    createCPUData({
      cpuUsage: usage,
      updatedAt: DateTime.local().toUTC().toISO(),
    }).then(
      action('fetchSuccess', res => {
        let newCpuData = this.lines.cpuData.map(x => x);
        let updatedAt = DateTime.fromISO(res.updatedAt).setZone(zone);
        updatedAt = `${updatedAt.toLocaleString(DateTime.DATE_SHORT)} ${updatedAt.toLocaleString(
          DateTime.TIME_24_WITH_SECONDS
        )}`;
        newCpuData.push({
          x: updatedAt,
          y: res.cpuUsage,
        });
        if (newCpuData.length > 40) {
          newCpuData.shift();
        }
        this.lines.cpuData = newCpuData;
        this.lines.latestUsage = usage;
      }),
      action('fetchError', e => (this.lines.title = 'error'))
    );
  }

  getCpuInfo() {
    this.isLoading = true;
    getCPUData().then(
      action('fetchSuccess', res => {
        if (res.content?.length === 0) return;
        let newCpuData: Array<CPUFrame> = [];
        this.counter++;
        res.content?.forEach(item => {
          let updatedAt = DateTime.fromISO(item.updatedAt).setZone(zone);
          updatedAt = `${updatedAt.toLocaleString(DateTime.DATE_SHORT)} ${updatedAt.toLocaleString(
            DateTime.TIME_24_WITH_SECONDS
          )}`;
          newCpuData.push({
            x: updatedAt,
            y: item.cpuUsage?.toPrecision(3),
          });
        });
        //@ts-ignore
        newCpuData.sort((x, y) => x.x?.localeCompare(y.x));
        this.lines.latestUsage = newCpuData[newCpuData.length - 1].y!!;
        this.lines.title = String(this.lines.latestUsage);
        this.lines.cpuData = newCpuData;
      }),
      action('fetchError', e => (this.lines.title = 'error'))
    );
    this.isLoading = false;
  }
}

const CpuStore = new CpuDataStore();
export default CpuStore;
