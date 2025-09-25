
import React from 'react';

interface DataTableProps<T> {
  headers: string[];
  data: T[];
  noDataMessage: string;
}

const DataTable = <T extends Record<string, any>,>(
  { headers, data, noDataMessage }: DataTableProps<T>
) => {

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
        <p className="text-gray-500">{noDataMessage}</p>
      </div>
    );
  }

  const objectKeys = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
          <tr>
            {headers.map((header, index) => (
              <th key={index} scope="col" className="px-6 py-3 tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-white border-b hover:bg-gray-50">
              {objectKeys.map((key, cellIndex) => (
                <td key={cellIndex} className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                  {String(row[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
