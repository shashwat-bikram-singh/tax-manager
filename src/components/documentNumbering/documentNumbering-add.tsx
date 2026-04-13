import React from 'react';
import DocumentNumberingForm from './documentNumbering-form';


const AddDocumentNumbering: React.FC = () => {
    return (
        <div>
            <DocumentNumberingForm mode="add" />
        </div>
    );
};

export default AddDocumentNumbering;