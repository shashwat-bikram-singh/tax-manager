export interface SubOfficeCard {
    officeId: number;
    officeName: string;
    subOfficeId: number;
    subOfficeName: string;
    photo: string;
    ticketsSold: number;
    totalNumberOfPerson: number;
    revenue: number;
}

export interface SubOfficeKeyName {
    subOfficeKey: string;
    subOfficeName: string;
}

export interface DashboardData {
    subOfficeCardList: SubOfficeCard[];
    graphJson: string;
    subOfficeKeyNameList: SubOfficeKeyName[];
}
